import uuid
from datetime import datetime
from decimal import Decimal, InvalidOperation

from django.conf import settings
from django.core.exceptions import ObjectDoesNotExist
from django.db.models import Sum, Q
from django.http import HttpResponse
from django.utils import timezone

from rest_framework import status
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response

from drf_spectacular.utils import extend_schema, OpenApiParameter

from authentication.models import Employee
from authentication.permissions import IsManager, IsManagerOrModerator, HasActiveSubscription

from attendance.models import Attendance

from wallet.models import WalletTransaction, RateHistory, PayAdjustmentRequest, wallet_balance, wallet_pending_payout, next_payout_due_at, is_payout_due
from wallet.serializers import WalletTransactionSerializer, RateHistorySerializer, PayAdjustmentRequestSerializer
from wallet.notify import (
	notify_payout_completed, notify_payout_failed,
	notify_pay_adjustment_submitted, notify_pay_adjustment_reviewed,
)
from wallet.reports import build_payroll_report_rows
from wallet.exporters import render_csv, render_pdf, render_excel

from commons.pagination import Pagination

try:
	import stripe
except ImportError:
	stripe = None




def _stripe_connect_configured():
	return bool(stripe and getattr(settings, 'STRIPE_SECRET_KEY', None))


def _connect_payouts_enabled(employee):
	"""Whether this employee has a Stripe Connect account that can actually
	receive money right now — false if they haven't onboarded, or Stripe
	hasn't finished verifying them yet."""
	account_id = getattr(employee, 'stripe_connect_account_id', None)
	if not (_stripe_connect_configured() and account_id):
		return False
	stripe.api_key = settings.STRIPE_SECRET_KEY
	try:
		account = stripe.Account.retrieve(account_id)
		return bool(account.to_dict().get('payouts_enabled'))
	except Exception:  # pragma: no cover - network/stripe errors
		return False


def _settle_payout(transaction):
	"""Attempts a real Stripe Connect transfer when the employee has a
	connected account and Stripe is configured; otherwise the payout is
	treated as settled by the manager outside the system (bank transfer),
	which is still recorded as the source of truth for payroll history."""
	employee = transaction.employee

	if _stripe_connect_configured() and getattr(employee, 'stripe_connect_account_id', None):
		try:
			stripe.api_key = settings.STRIPE_SECRET_KEY
			amount_cents = int(transaction.amount * 100)
			transfer = stripe.Transfer.create(
				amount=amount_cents,
				currency=employee.currency,
				destination=employee.stripe_connect_account_id,
				transfer_group=str(transaction.batch_id or transaction.transaction_id),
			)
			transaction.stripe_transfer_id = transfer.id
			transaction.mark_completed()
		except Exception as exc:  # pragma: no cover - network/stripe errors
			transaction.mark_failed(str(exc))
			notify_payout_failed(transaction)
		return transaction

	transaction.note = transaction.note or 'Settled manually — pay via bank transfer and keep this record for your books.'
	transaction.mark_completed()
	return transaction


def _charge_payout_via_saved_card(transaction, employee, organization):
	"""Charges the org's saved default card for one employee's payout via a
	Destination Charge (transfer_data + application_fee_amount), same shape
	as the interactive Checkout path in reviewPayoutRequest, and marks the
	transaction completed/failed based on the result. Shared by a single
	manual approval and a full payroll run so both move real money the same
	way. Returns (transaction, commission_percent, commission_amount, total_charge)."""
	commission_percent = organization.effective_commission_percent()
	commission_amount = (transaction.amount * commission_percent / Decimal('100')).quantize(Decimal('0.01'))
	total_charge = transaction.amount + commission_amount

	stripe.api_key = settings.STRIPE_SECRET_KEY
	try:
		intent = stripe.PaymentIntent.create(
			amount=int(total_charge * 100),
			currency=employee.currency,
			customer=organization.stripe_customer_id,
			payment_method=organization.default_payout_payment_method_id,
			off_session=True,
			confirm=True,
			transfer_data={'destination': employee.stripe_connect_account_id},
			application_fee_amount=int(commission_amount * 100),
			metadata={'purpose': 'payout_single', 'wallet_transaction_id': str(transaction.id)},
		).to_dict()
	except stripe.error.CardError as exc:  # pragma: no cover - depends on the card
		transaction.mark_failed(exc.user_message or str(exc))
		notify_payout_failed(transaction)
		return transaction, commission_percent, commission_amount, total_charge
	except Exception as exc:  # pragma: no cover - network/stripe errors
		transaction.mark_failed(str(exc))
		notify_payout_failed(transaction)
		return transaction, commission_percent, commission_amount, total_charge

	if intent.get('status') == 'succeeded':
		transaction.mark_completed()
		notify_payout_completed(transaction)
	else:  # pragma: no cover - e.g. requires_action (3D Secure) on an off-session charge
		transaction.mark_failed(f"Payment needs manual confirmation (status: {intent.get('status')})")
		notify_payout_failed(transaction)

	return transaction, commission_percent, commission_amount, total_charge




def _week_bounds():
	today = timezone.localdate()
	start = today - timezone.timedelta(days=today.weekday())
	end = start + timezone.timedelta(days=6)
	return start, end




@extend_schema(request=None, responses=None)
@api_view(['GET'])
@permission_classes([IsAuthenticated, HasActiveSubscription])
def getMyWallet(request):
	try:
		employee = Employee.objects.get(pk=request.user.pk)
	except ObjectDoesNotExist:
		return Response({'detail': 'Only employees have a wallet'}, status=status.HTTP_400_BAD_REQUEST)

	week_start, week_end = _week_bounds()

	this_week = WalletTransaction.objects.filter(
		employee=employee, type=WalletTransaction.Type.EARNING, status=WalletTransaction.Status.COMPLETED,
		created_at__date__gte=week_start, created_at__date__lte=week_end,
	).aggregate(s=Sum('amount'))['s'] or 0

	history = WalletTransaction.objects.filter(employee=employee).order_by('-created_at')[:50]

	return Response(
		{
			'current_balance': wallet_balance(employee),
			'pending_payout': wallet_pending_payout(employee),
			'this_week_earnings': this_week,
			'hourly_rate': employee.hourly_rate,
			'payout_cycle': employee.payout_cycle,
			'currency': employee.currency,
			'next_payout_due_at': next_payout_due_at(employee),
			'history': WalletTransactionSerializer(history, many=True).data,
			'payouts_available': employee.organization.has_paid_subscription(),
			'payout_method_connected': bool(getattr(employee, 'stripe_connect_account_id', None)),
			'payouts_enabled': _connect_payouts_enabled(employee),
		},
		status=status.HTTP_200_OK,
	)




@extend_schema(request=None, responses=None)
@api_view(['POST'])
@permission_classes([IsAuthenticated, HasActiveSubscription])
def connectOnboard(request):
	"""Starts (or resumes/extends) Stripe Express onboarding for the
	employee's payout account. Returns a one-time hosted-page URL — same
	link works to add another bank account/card later, since Stripe just
	reuses the existing connected account once one exists."""
	if not _stripe_connect_configured():
		return Response({'detail': 'Payouts are not configured for this platform yet.'}, status=status.HTTP_400_BAD_REQUEST)

	try:
		employee = Employee.objects.get(pk=request.user.pk)
	except ObjectDoesNotExist:
		return Response({'detail': 'Only employees can set up a payout method'}, status=status.HTTP_400_BAD_REQUEST)

	stripe.api_key = settings.STRIPE_SECRET_KEY

	try:
		if not employee.stripe_connect_account_id:
			account = stripe.Account.create(
				type='express',
				country='AU',
				email=employee.email,
				capabilities={'transfers': {'requested': True}},
				# AU (and some other countries) requires either the 'recipient'
				# service agreement or the card_payments capability alongside
				# transfers. Employees never take card payments themselves —
				# they only receive payouts — so 'recipient' is the correct,
				# lighter-weight agreement for this account.
				tos_acceptance={'service_agreement': 'recipient'},
			)
			employee.stripe_connect_account_id = account.id
			employee.save(update_fields=['stripe_connect_account_id'])
			link_type = 'account_onboarding'
		else:
			# Stripe only allows 'account_update' links once the initial
			# onboarding has actually been completed — until then (e.g. they
			# started but didn't finish), it has to stay 'account_onboarding'.
			existing = stripe.Account.retrieve(employee.stripe_connect_account_id).to_dict()
			link_type = 'account_update' if existing.get('details_submitted') else 'account_onboarding'

		# The web app always redirects back to itself; the mobile app has no
		# web origin to return to, so it passes its own custom-scheme deep
		# link instead (e.g. timetap://wallet/connect/success) — accepted
		# as-is since Stripe's AccountLink supports non-https return URLs
		# for native app integrations.
		return_base = settings.BILLING_RETURN_URL
		refresh_url = request.data.get('refresh_url') or f'{return_base.rstrip("/")}/?connect=refresh'
		return_url = request.data.get('return_url') or f'{return_base.rstrip("/")}/?connect=done'
		account_link = stripe.AccountLink.create(
			account=employee.stripe_connect_account_id,
			refresh_url=refresh_url,
			return_url=return_url,
			type=link_type,
		)
	except Exception as exc:  # pragma: no cover - network/stripe errors
		return Response({'detail': f'Could not start payout setup: {exc}'}, status=status.HTTP_400_BAD_REQUEST)

	return Response({'url': account_link.url}, status=status.HTTP_200_OK)




@extend_schema(request=None, responses=None)
@api_view(['GET'])
@permission_classes([IsAuthenticated, HasActiveSubscription])
def connectStatus(request):
	try:
		employee = Employee.objects.get(pk=request.user.pk)
	except ObjectDoesNotExist:
		return Response({'detail': 'Only employees have a payout method'}, status=status.HTTP_400_BAD_REQUEST)

	if not employee.stripe_connect_account_id:
		return Response({'connected': False, 'details_submitted': False, 'payouts_enabled': False}, status=status.HTTP_200_OK)

	if not _stripe_connect_configured():
		return Response({'connected': True, 'details_submitted': False, 'payouts_enabled': False}, status=status.HTTP_200_OK)

	stripe.api_key = settings.STRIPE_SECRET_KEY
	try:
		account = stripe.Account.retrieve(employee.stripe_connect_account_id).to_dict()
		return Response(
			{
				'connected': True,
				'details_submitted': bool(account.get('details_submitted')),
				'payouts_enabled': bool(account.get('payouts_enabled')),
			},
			status=status.HTTP_200_OK,
		)
	except Exception as exc:  # pragma: no cover - network/stripe errors
		return Response({'detail': f'Could not check payout status: {exc}'}, status=status.HTTP_400_BAD_REQUEST)




@extend_schema(request=None, responses=None)
@api_view(['POST'])
@permission_classes([IsAuthenticated, HasActiveSubscription])
def requestPayout(request):
	try:
		employee = Employee.objects.get(pk=request.user.pk)
	except ObjectDoesNotExist:
		return Response({'detail': 'Only employees can request a payout'}, status=status.HTTP_400_BAD_REQUEST)

	organization = employee.organization
	if not organization.has_paid_subscription():
		return Response(
			{'detail': "Cash-out requests aren't available during the free trial — they open up once your employer subscribes."},
			status=status.HTTP_402_PAYMENT_REQUIRED,
		)

	if not _connect_payouts_enabled(employee):
		return Response(
			{'detail': 'Add a bank account or card to receive your payout before requesting one.'},
			status=status.HTTP_400_BAD_REQUEST,
		)

	try:
		amount = Decimal(str(request.data.get('amount')))
	except (InvalidOperation, TypeError):
		return Response({'detail': 'A valid amount is required'}, status=status.HTTP_400_BAD_REQUEST)

	if amount <= 0:
		return Response({'detail': 'Amount must be greater than zero'}, status=status.HTTP_400_BAD_REQUEST)

	balance = wallet_balance(employee)
	if amount > balance:
		return Response({'detail': f'You only have ${balance} available'}, status=status.HTTP_400_BAD_REQUEST)

	transaction = WalletTransaction.objects.create(
		employee=employee,
		organization=organization,
		type=WalletTransaction.Type.PAYOUT,
		status=WalletTransaction.Status.PENDING,
		amount=amount,
		created_by=request.user,
		note='Cash-out requested by employee — awaiting manager payment',
	)

	return Response(WalletTransactionSerializer(transaction).data, status=status.HTTP_201_CREATED)




@extend_schema(request=None, responses=None)
@api_view(['GET'])
@permission_classes([IsManagerOrModerator, HasActiveSubscription])
def getPayrollSummary(request):
	organization = request.user.organization
	week_start, week_end = _week_bounds()

	employees = Employee.objects.filter(organization=organization).order_by('first_name', 'last_name')

	rows = []
	total_balance = Decimal('0')
	pending_requests = 0

	for employee in employees:
		balance = wallet_balance(employee)
		pending = wallet_pending_payout(employee)
		this_week = WalletTransaction.objects.filter(
			employee=employee, type=WalletTransaction.Type.EARNING, status=WalletTransaction.Status.COMPLETED,
			created_at__date__gte=week_start, created_at__date__lte=week_end,
		).aggregate(s=Sum('amount'))['s'] or 0

		if pending:
			pending_requests += 1
		total_balance += balance

		rows.append(
			{
				'employee': {'id': employee.id, 'first_name': employee.first_name, 'last_name': employee.last_name, 'email': employee.email},
				'hourly_rate': employee.hourly_rate,
				'currency': employee.currency,
				'payout_cycle': employee.payout_cycle,
				'this_week_earnings': this_week,
				'current_balance': balance,
				'pending_payout': pending,
				'next_payout_due_at': next_payout_due_at(employee),
				'is_payout_due': is_payout_due(employee),
			}
		)

	pending_qs = WalletTransaction.objects.filter(
		organization=organization, type=WalletTransaction.Type.PAYOUT, status=WalletTransaction.Status.PENDING
	).order_by('-created_at')

	return Response(
		{
			'employees': rows,
			'currency': organization.currency,
			'total_payable': total_balance,
			'pending_request_count': pending_requests,
			'pending_requests': WalletTransactionSerializer(pending_qs, many=True).data,
			'payouts_available': organization.has_paid_subscription(),
			'commission_percent': organization.effective_commission_percent(),
		},
		status=status.HTTP_200_OK,
	)




def _parse_report_range(request):
	date_from = request.query_params.get('date_from')
	date_to = request.query_params.get('date_to')
	if not date_from or not date_to:
		return None, None, Response({'detail': 'date_from and date_to are required'}, status=status.HTTP_400_BAD_REQUEST)
	try:
		date_from = datetime.strptime(date_from, '%Y-%m-%d').date()
		date_to = datetime.strptime(date_to, '%Y-%m-%d').date()
	except ValueError:
		return None, None, Response({'detail': 'date_from/date_to must be YYYY-MM-DD'}, status=status.HTTP_400_BAD_REQUEST)
	return date_from, date_to, None




@extend_schema(request=None, responses=None)
@api_view(['GET'])
@permission_classes([IsManagerOrModerator, HasActiveSubscription])
def exportPayrollCsv(request):
	date_from, date_to, error = _parse_report_range(request)
	if error:
		return error

	rows = build_payroll_report_rows(date_from, date_to, request.user.organization)
	csv_bytes = render_csv(rows)

	response = HttpResponse(csv_bytes, content_type='text/csv')
	response['Content-Disposition'] = f'attachment; filename="payroll-report_{date_from}_to_{date_to}.csv"'
	return response




@extend_schema(request=None, responses=None)
@api_view(['GET'])
@permission_classes([IsManagerOrModerator, HasActiveSubscription])
def exportPayrollPdf(request):
	date_from, date_to, error = _parse_report_range(request)
	if error:
		return error

	rows = build_payroll_report_rows(date_from, date_to, request.user.organization)
	pdf_bytes = render_pdf(rows, date_from, date_to)

	response = HttpResponse(pdf_bytes, content_type='application/pdf')
	response['Content-Disposition'] = f'attachment; filename="payroll-report_{date_from}_to_{date_to}.pdf"'
	return response




@extend_schema(request=None, responses=None)
@api_view(['GET'])
@permission_classes([IsManagerOrModerator, HasActiveSubscription])
def exportPayrollExcel(request):
	date_from, date_to, error = _parse_report_range(request)
	if error:
		return error

	rows = build_payroll_report_rows(date_from, date_to, request.user.organization)
	excel_bytes = render_excel(rows, date_from, date_to)

	response = HttpResponse(excel_bytes, content_type='application/vnd.openxmlformats-officedocument.spreadsheetml.sheet')
	response['Content-Disposition'] = f'attachment; filename="payroll-report_{date_from}_to_{date_to}.xlsx"'
	return response




@extend_schema(request=None, responses=None)
@api_view(['POST'])
@permission_classes([IsManager, HasActiveSubscription])
def runPayrollNow(request):
	"""'Approve & Pay Payroll' — pays every employee's full current balance
	right now in one manager action, regardless of where each employee is
	in their own payout cycle, grouped under one batch. Each payout is a
	real Destination Charge against the org's saved payout card — the same
	charge reviewPayoutRequest makes for a single approval — so this never
	moves during a trial and never runs without a saved card (there's no
	way to send the manager to an interactive Checkout page once per
	employee in a single click)."""
	organization = request.user.organization

	if not organization.has_paid_subscription():
		return Response(
			{'detail': "Paying out real money isn't available during the free trial — subscribe to unlock it."},
			status=status.HTTP_402_PAYMENT_REQUIRED,
		)

	if not (_stripe_connect_configured() and organization.stripe_customer_id and organization.default_payout_payment_method_id):
		return Response(
			{'detail': 'Save a payout card first (Payroll → Payout card) before paying everyone in one click.'},
			status=status.HTTP_400_BAD_REQUEST,
		)

	employees = Employee.objects.filter(organization=organization)

	batch_id = uuid.uuid4()
	paid = []
	failed = []
	skipped = []

	for employee in employees:
		balance = wallet_balance(employee)
		if balance <= 0:
			continue

		if not _connect_payouts_enabled(employee):
			skipped.append(f'{employee.first_name} {employee.last_name}')
			continue

		transaction = WalletTransaction.objects.create(
			employee=employee,
			organization=organization,
			type=WalletTransaction.Type.PAYOUT,
			status=WalletTransaction.Status.PENDING,
			amount=balance,
			batch_id=batch_id,
			created_by=request.user,
			note='Manual payroll run',
		)
		transaction, *_ = _charge_payout_via_saved_card(transaction, employee, organization)
		(paid if transaction.status == WalletTransaction.Status.COMPLETED else failed).append(transaction)

	return Response(
		{
			'batch_id': batch_id,
			'employees_paid': len(paid),
			'employees_failed': len(failed),
			'employees_skipped': skipped,
			'total_paid': sum((t.amount for t in paid), Decimal('0')),
			'transactions': WalletTransactionSerializer(paid + failed, many=True).data,
		},
		status=status.HTTP_200_OK,
	)




@extend_schema(request=None, responses=None)
@api_view(['POST'])
@permission_classes([IsManager, HasActiveSubscription])
def reviewPayoutRequest(request, pk):
	action = request.data.get('action')
	if action not in ('approve', 'reject'):
		return Response({'detail': "action must be 'approve' or 'reject'"}, status=status.HTTP_400_BAD_REQUEST)

	try:
		transaction = WalletTransaction.objects.get(pk=pk, organization=request.user.organization, type=WalletTransaction.Type.PAYOUT)
	except ObjectDoesNotExist:
		return Response({'detail': 'Payout request not found'}, status=status.HTTP_404_NOT_FOUND)

	if transaction.status != WalletTransaction.Status.PENDING:
		return Response({'detail': 'This request has already been reviewed'}, status=status.HTTP_400_BAD_REQUEST)

	if action == 'reject':
		reason = request.data.get('reason', 'Rejected by manager')
		transaction.mark_failed(reason)
		return Response(WalletTransactionSerializer(transaction).data, status=status.HTTP_200_OK)

	organization = request.user.organization

	if not organization.has_paid_subscription():
		return Response(
			{'detail': "Paying out real money isn't available during the free trial — subscribe to unlock it."},
			status=status.HTTP_402_PAYMENT_REQUIRED,
		)

	# transaction.employee is a plain User (the FK targets AUTH_USER_MODEL) —
	# stripe_connect_account_id/currency only exist on the Employee subclass,
	# so it has to be fetched explicitly rather than read straight off the FK.
	employee = Employee.objects.get(pk=transaction.employee_id)
	if not _connect_payouts_enabled(employee):
		return Response(
			{'detail': f'{employee.first_name} has not finished setting up a payout method yet.'},
			status=status.HTTP_400_BAD_REQUEST,
		)

	if not (_stripe_connect_configured() and organization.stripe_customer_id):
		return Response({'detail': 'Payments are not configured for this store yet.'}, status=status.HTTP_400_BAD_REQUEST)

	commission_percent = organization.effective_commission_percent()
	commission_amount = (transaction.amount * commission_percent / Decimal('100')).quantize(Decimal('0.01'))
	total_charge = transaction.amount + commission_amount

	stripe.api_key = settings.STRIPE_SECRET_KEY

	# A card already on file — charge it directly, right now, no redirect.
	# This is what makes repeat approvals instant: the Manager sets up a
	# card once (Payroll → payout card), and every approval after that just
	# runs against it.
	if organization.default_payout_payment_method_id:
		transaction, commission_percent, commission_amount, total_charge = _charge_payout_via_saved_card(transaction, employee, organization)
		if transaction.status == WalletTransaction.Status.FAILED:
			return Response({'detail': f'Payment failed: {transaction.failure_reason}'}, status=status.HTTP_400_BAD_REQUEST)

		return Response(
			{
				'commission_percent': commission_percent,
				'commission_amount': commission_amount,
				'total_charge': total_charge,
				'transaction': WalletTransactionSerializer(transaction).data,
			},
			status=status.HTTP_200_OK,
		)

	# No saved card yet — send the Manager to a one-off Checkout page. They
	# can still use this to save a card for next time via "Payout card" in
	# Payroll, independent of this particular payment.
	#
	# The web app always redirects back to itself; the mobile app has no
	# web origin to return to, so it passes its own custom-scheme deep
	# link instead (e.g. timetap://payout/success).
	default_success = f'{settings.BILLING_RETURN_URL}/?payout=success&session_id={{CHECKOUT_SESSION_ID}}'
	default_cancel = f'{settings.BILLING_RETURN_URL}/?payout=cancelled'
	success_url = request.data.get('success_url') or default_success
	cancel_url = request.data.get('cancel_url') or default_cancel
	if '{CHECKOUT_SESSION_ID}' not in success_url:
		success_url += ('&' if '?' in success_url else '?') + 'session_id={CHECKOUT_SESSION_ID}'

	try:
		session = stripe.checkout.Session.create(
			mode='payment',
			customer=organization.stripe_customer_id,
			payment_method_types=['card'],
			line_items=[
				{
					'price_data': {
						'currency': employee.currency,
						'unit_amount': int(total_charge * 100),
						'product_data': {
							'name': f'Payout to {employee.first_name} {employee.last_name}',
							'description': (
								f'{employee.currency.upper()} {transaction.amount} to {employee.first_name} '
								f'+ {commission_percent}% platform fee ({employee.currency.upper()} {commission_amount})'
							),
						},
					},
					'quantity': 1,
				}
			],
			payment_intent_data={
				# Stripe rejects setting both transfer_data[amount] and
				# application_fee_amount together — application_fee_amount
				# alone is enough: the destination automatically receives
				# (total charge - application fee), which is exactly the
				# employee's payout amount, since the charge total already
				# equals payout + commission.
				'transfer_data': {
					'destination': employee.stripe_connect_account_id,
				},
				'application_fee_amount': int(commission_amount * 100),
				# Duplicated onto the PaymentIntent (not just the Session) so a
				# payment_intent.payment_failed webhook — which only carries the
				# PaymentIntent, not the Session — can still find this transaction.
				'metadata': {'purpose': 'payout_single', 'wallet_transaction_id': str(transaction.id)},
			},
			metadata={'purpose': 'payout_single', 'wallet_transaction_id': str(transaction.id)},
			success_url=success_url,
			cancel_url=cancel_url,
		)
	except Exception as exc:  # pragma: no cover - network/stripe errors
		return Response({'detail': f'Could not start payment: {exc}'}, status=status.HTTP_400_BAD_REQUEST)

	transaction.note = f'Awaiting card payment from manager — {commission_percent}% platform fee ({employee.currency.upper()} {commission_amount}) added on top'
	transaction.save(update_fields=['note'])

	return Response(
		{
			'checkout_url': session.url,
			'commission_percent': commission_percent,
			'commission_amount': commission_amount,
			'total_charge': total_charge,
			'transaction': WalletTransactionSerializer(transaction).data,
		},
		status=status.HTTP_200_OK,
	)




@extend_schema(request=None, responses=None)
@api_view(['POST'])
@permission_classes([IsManagerOrModerator])
def confirmPayoutCheckout(request):
	"""Fallback for local dev (no public URL for Stripe's webhook to reach)
	and a fast-path even in production: called right after the Manager
	returns from the payout Checkout page, so the UI doesn't have to sit
	there waiting on the webhook."""
	if not _stripe_connect_configured():
		return Response({'detail': 'Payments are not configured yet on this server.'}, status=status.HTTP_503_SERVICE_UNAVAILABLE)

	session_id = request.data.get('session_id')
	if not session_id:
		return Response({'detail': 'session_id is required'}, status=status.HTTP_400_BAD_REQUEST)

	stripe.api_key = settings.STRIPE_SECRET_KEY
	try:
		session = stripe.checkout.Session.retrieve(session_id).to_dict()
	except Exception:
		return Response({'detail': 'Could not verify that checkout session'}, status=status.HTTP_400_BAD_REQUEST)

	metadata = session.get('metadata') or {}
	transaction_id = metadata.get('wallet_transaction_id')
	if not transaction_id:
		return Response({'detail': 'This checkout session is not a payout'}, status=status.HTTP_400_BAD_REQUEST)

	try:
		transaction = WalletTransaction.objects.get(pk=transaction_id, organization=request.user.organization)
	except ObjectDoesNotExist:
		return Response({'detail': 'Payout not found'}, status=status.HTTP_404_NOT_FOUND)

	if transaction.status == WalletTransaction.Status.PENDING:
		if session.get('payment_status') == 'paid' or session.get('status') == 'complete':
			transaction.mark_completed()
			notify_payout_completed(transaction)
		elif session.get('status') in ('expired',):
			transaction.mark_failed('Checkout session expired without payment')
			notify_payout_failed(transaction)

	return Response(WalletTransactionSerializer(transaction).data, status=status.HTTP_200_OK)




@extend_schema(request=None, responses=RateHistorySerializer)
@api_view(['GET'])
@permission_classes([IsAuthenticated, HasActiveSubscription])
def getRateHistory(request, employee_id):
	"""Visible to the employee themselves (their own pay history), and to
	whoever can manage pay for the store (Manager, or a permitted Moderator)."""
	try:
		employee = Employee.objects.get(pk=employee_id, organization=request.user.organization)
	except ObjectDoesNotExist:
		return Response({'detail': f"Employee id - {employee_id} doesn't exist"}, status=status.HTTP_404_NOT_FOUND)

	is_self = request.user.pk == employee.pk
	if not (is_self or request.user.can_add_employees()):
		return Response({'detail': 'You do not have permission to view this.'}, status=status.HTTP_403_FORBIDDEN)

	history = RateHistory.objects.filter(employee=employee).order_by('-created_at')
	return Response({'history': RateHistorySerializer(history, many=True).data}, status=status.HTTP_200_OK)




@extend_schema(
	parameters=[OpenApiParameter("page"), OpenApiParameter("size")],
	request=None, responses=WalletTransactionSerializer,
)
@api_view(['GET'])
@permission_classes([IsManagerOrModerator, HasActiveSubscription])
def listTransactions(request):
	transactions = WalletTransaction.objects.filter(organization=request.user.organization)

	employee_id = request.query_params.get('employee_id')
	if employee_id:
		transactions = transactions.filter(employee_id=employee_id)

	txn_type = request.query_params.get('type')
	if txn_type:
		transactions = transactions.filter(type=txn_type)

	total_elements = transactions.count()

	pagination = Pagination()
	pagination.page = request.query_params.get('page')
	pagination.size = request.query_params.get('size')
	transactions = pagination.paginate_data(transactions)

	return Response(
		{
			'transactions': WalletTransactionSerializer(transactions, many=True).data,
			'page': pagination.page,
			'size': pagination.size,
			'total_pages': pagination.total_pages,
			'total_elements': total_elements,
		},
		status=status.HTTP_200_OK,
	)




def _unclaimed_hours(attendance, kind):
	"""How much of this day's overtime/shortfall pool hasn't already been
	paid out through an accepted claim — resubmitting after a partial or
	zero grant can never add up to more than what was actually worked
	(or missed)."""
	pool = attendance.overtime_hours if kind == PayAdjustmentRequest.Kind.OVERTIME else attendance.shortfall_hours
	accepted = PayAdjustmentRequest.objects.filter(
		attendance=attendance, kind=kind, status=PayAdjustmentRequest.Status.ACCEPTED,
	).aggregate(s=Sum('hours'))['s'] or Decimal('0')
	return (pool or Decimal('0')) - accepted




@extend_schema(request=None, responses=None)
@api_view(['GET'])
@permission_classes([IsAuthenticated, HasActiveSubscription])
def getEligiblePayAdjustments(request):
	"""Days where the employee worked more (or less) than their scheduled
	shift and hasn't fully claimed it yet — what shows up as "Overtime" /
	"Shortfall" cards on their Wallet page."""
	try:
		employee = Employee.objects.get(pk=request.user.pk)
	except ObjectDoesNotExist:
		return Response({'detail': 'Only employees have this'}, status=status.HTTP_400_BAD_REQUEST)

	attendances = Attendance.objects.filter(employee=employee).filter(
		Q(overtime_hours__gt=0) | Q(shortfall_hours__gt=0)
	).order_by('-date')[:60]

	rows = []
	for attendance in attendances:
		for kind in (PayAdjustmentRequest.Kind.OVERTIME, PayAdjustmentRequest.Kind.SHORTFALL):
			pool = attendance.overtime_hours if kind == PayAdjustmentRequest.Kind.OVERTIME else attendance.shortfall_hours
			if not pool:
				continue
			unclaimed = _unclaimed_hours(attendance, kind)
			if unclaimed <= 0:
				continue
			has_pending = PayAdjustmentRequest.objects.filter(
				attendance=attendance, kind=kind, status=PayAdjustmentRequest.Status.PENDING
			).exists()
			rows.append(
				{
					'attendance_id': attendance.id,
					'date': attendance.date,
					'kind': kind,
					'hours': unclaimed,
					'amount': round(unclaimed * employee.hourly_rate, 2) if employee.hourly_rate else None,
					'has_pending_request': has_pending,
				}
			)

	return Response({'eligible': rows}, status=status.HTTP_200_OK)




@extend_schema(request=None, responses=PayAdjustmentRequestSerializer)
@api_view(['POST'])
@permission_classes([IsAuthenticated, HasActiveSubscription])
def createPayAdjustmentRequest(request):
	try:
		employee = Employee.objects.get(pk=request.user.pk)
	except ObjectDoesNotExist:
		return Response({'detail': 'Only employees can submit this'}, status=status.HTTP_400_BAD_REQUEST)

	kind = request.data.get('kind')
	if kind not in PayAdjustmentRequest.Kind.values:
		return Response({'detail': "kind must be 'overtime' or 'shortfall'"}, status=status.HTTP_400_BAD_REQUEST)

	try:
		attendance = Attendance.objects.get(pk=request.data.get('attendance'), employee=employee)
	except (ObjectDoesNotExist, ValueError, TypeError):
		return Response({'detail': 'Attendance record not found'}, status=status.HTTP_404_NOT_FOUND)

	if PayAdjustmentRequest.objects.filter(
		attendance=attendance, kind=kind, status=PayAdjustmentRequest.Status.PENDING
	).exists():
		return Response({'detail': 'A request for this is already pending review.'}, status=status.HTTP_400_BAD_REQUEST)

	if not employee.hourly_rate:
		return Response({'detail': 'Set an hourly rate before requesting this.'}, status=status.HTTP_400_BAD_REQUEST)

	unclaimed = _unclaimed_hours(attendance, kind)
	if unclaimed <= 0:
		return Response({'detail': 'There is nothing unclaimed to request here.'}, status=status.HTTP_400_BAD_REQUEST)

	obj = PayAdjustmentRequest.objects.create(
		employee=employee,
		organization=employee.organization,
		attendance=attendance,
		kind=kind,
		hours=unclaimed,
		requested_amount=round(unclaimed * employee.hourly_rate, 2),
		note=request.data.get('note') or None,
		attachment=request.FILES.get('attachment'),
	)
	notify_pay_adjustment_submitted(obj)
	return Response(PayAdjustmentRequestSerializer(obj).data, status=status.HTTP_201_CREATED)




@extend_schema(request=None, responses=PayAdjustmentRequestSerializer)
@api_view(['GET'])
@permission_classes([IsAuthenticated, HasActiveSubscription])
def listMyPayAdjustments(request):
	try:
		employee = Employee.objects.get(pk=request.user.pk)
	except ObjectDoesNotExist:
		return Response({'detail': 'Only employees have this'}, status=status.HTTP_400_BAD_REQUEST)

	qs = PayAdjustmentRequest.objects.filter(employee=employee).order_by('-created_at')[:50]
	return Response({'requests': PayAdjustmentRequestSerializer(qs, many=True).data}, status=status.HTTP_200_OK)




@extend_schema(
	parameters=[OpenApiParameter("status")],
	request=None, responses=PayAdjustmentRequestSerializer,
)
@api_view(['GET'])
@permission_classes([IsManagerOrModerator, HasActiveSubscription])
def listOrgPayAdjustments(request):
	qs = PayAdjustmentRequest.objects.filter(organization=request.user.organization)
	status_filter = request.query_params.get('status')
	if status_filter:
		qs = qs.filter(status=status_filter)
	return Response({'requests': PayAdjustmentRequestSerializer(qs[:100], many=True).data}, status=status.HTTP_200_OK)




@extend_schema(request=None, responses=PayAdjustmentRequestSerializer)
@api_view(['POST'])
@permission_classes([IsManagerOrModerator, HasActiveSubscription])
def reviewPayAdjustment(request, pk):
	try:
		obj = PayAdjustmentRequest.objects.get(pk=pk, organization=request.user.organization)
	except ObjectDoesNotExist:
		return Response({'detail': 'Request not found'}, status=status.HTTP_404_NOT_FOUND)

	if obj.status != PayAdjustmentRequest.Status.PENDING:
		return Response({'detail': 'This request has already been reviewed'}, status=status.HTTP_400_BAD_REQUEST)

	try:
		granted = Decimal(str(request.data.get('granted_amount')))
	except (InvalidOperation, TypeError):
		return Response({'detail': 'A valid granted_amount is required'}, status=status.HTTP_400_BAD_REQUEST)

	if granted < 0 or granted > obj.requested_amount:
		return Response({'detail': f'granted_amount must be between 0 and {obj.requested_amount}'}, status=status.HTTP_400_BAD_REQUEST)

	obj.granted_amount = granted
	obj.manager_note = request.data.get('manager_note') or None
	obj.status = PayAdjustmentRequest.Status.REVIEWED
	obj.reviewed_by = request.user
	obj.reviewed_at = timezone.now()
	obj.save()

	notify_pay_adjustment_reviewed(obj)
	return Response(PayAdjustmentRequestSerializer(obj).data, status=status.HTTP_200_OK)




@extend_schema(request=None, responses=PayAdjustmentRequestSerializer)
@api_view(['POST'])
@permission_classes([IsAuthenticated, HasActiveSubscription])
def acceptPayAdjustment(request, pk):
	try:
		employee = Employee.objects.get(pk=request.user.pk)
	except ObjectDoesNotExist:
		return Response({'detail': 'Only employees can accept this'}, status=status.HTTP_400_BAD_REQUEST)

	try:
		obj = PayAdjustmentRequest.objects.get(pk=pk, employee=employee)
	except ObjectDoesNotExist:
		return Response({'detail': 'Request not found'}, status=status.HTTP_404_NOT_FOUND)

	if obj.status != PayAdjustmentRequest.Status.REVIEWED:
		return Response({'detail': 'This request is not ready to accept'}, status=status.HTTP_400_BAD_REQUEST)

	obj.status = PayAdjustmentRequest.Status.ACCEPTED
	obj.accepted_at = timezone.now()

	if obj.granted_amount:
		# Safeguard against double-claiming the same hours through an old
		# reviewed request left over from before a resubmission — this is
		# the actual source of truth, not "is there another pending row".
		already_accepted = PayAdjustmentRequest.objects.filter(
			attendance=obj.attendance, kind=obj.kind, status=PayAdjustmentRequest.Status.ACCEPTED,
		).exclude(pk=obj.pk).aggregate(s=Sum('hours'))['s'] or Decimal('0')
		pool = obj.attendance.overtime_hours if obj.kind == PayAdjustmentRequest.Kind.OVERTIME else obj.attendance.shortfall_hours
		if already_accepted + obj.hours > (pool or Decimal('0')):
			return Response({'detail': 'Part of this has already been claimed through another request.'}, status=status.HTTP_400_BAD_REQUEST)

		obj.save()
		WalletTransaction.objects.create(
			employee=employee,
			organization=employee.organization,
			type=WalletTransaction.Type.EARNING,
			status=WalletTransaction.Status.COMPLETED,
			amount=obj.granted_amount,
			related_attendance=obj.attendance,
			note=f"{obj.get_kind_display()} claim accepted for {obj.attendance.date}",
		)
	else:
		obj.save()

	return Response(PayAdjustmentRequestSerializer(obj).data, status=status.HTTP_200_OK)
