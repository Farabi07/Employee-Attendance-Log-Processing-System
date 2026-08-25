import uuid
from decimal import Decimal, InvalidOperation

from django.conf import settings
from django.core.exceptions import ObjectDoesNotExist
from django.db.models import Sum
from django.utils import timezone

from rest_framework import status
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response

from drf_spectacular.utils import extend_schema, OpenApiParameter

from authentication.models import Employee
from authentication.permissions import IsManager, IsManagerOrModerator, HasActiveSubscription

from wallet.models import WalletTransaction, wallet_balance, wallet_pending_payout, next_payout_due_at, is_payout_due
from wallet.serializers import WalletTransactionSerializer
from wallet.notify import notify_payout_completed, notify_payout_failed

from commons.pagination import Pagination

try:
	import stripe
except ImportError:
	stripe = None




def _stripe_connect_configured():
	return bool(stripe and getattr(settings, 'STRIPE_SECRET_KEY', None))


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
				currency=transaction.organization.currency,
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
			'currency': employee.organization.currency,
			'next_payout_due_at': next_payout_due_at(employee),
			'history': WalletTransactionSerializer(history, many=True).data,
		},
		status=status.HTTP_200_OK,
	)




@extend_schema(request=None, responses=None)
@api_view(['POST'])
@permission_classes([IsAuthenticated, HasActiveSubscription])
def requestPayout(request):
	try:
		employee = Employee.objects.get(pk=request.user.pk)
	except ObjectDoesNotExist:
		return Response({'detail': 'Only employees can request a payout'}, status=status.HTTP_400_BAD_REQUEST)

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
		organization=employee.organization,
		type=WalletTransaction.Type.PAYOUT,
		status=WalletTransaction.Status.PENDING,
		amount=amount,
		created_by=request.user,
		note='Instant cash-out requested by employee',
	)

	if _stripe_connect_configured() and getattr(employee, 'stripe_connect_account_id', None):
		transaction = _settle_payout(transaction)
		if transaction.status == WalletTransaction.Status.COMPLETED:
			notify_payout_completed(transaction)

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
		},
		status=status.HTTP_200_OK,
	)




@extend_schema(request=None, responses=None)
@api_view(['POST'])
@permission_classes([IsManager, HasActiveSubscription])
def runPayrollNow(request):
	"""'Approve & Pay Payroll' — a manual manager override that pays out
	every employee's full current balance right now, regardless of where
	each employee is in their own payout cycle. Grouped under one batch."""
	organization = request.user.organization
	employees = Employee.objects.filter(organization=organization)

	batch_id = uuid.uuid4()
	paid = []

	for employee in employees:
		balance = wallet_balance(employee)
		if balance <= 0:
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
		transaction = _settle_payout(transaction)
		if transaction.status == WalletTransaction.Status.COMPLETED:
			notify_payout_completed(transaction)
		paid.append(transaction)

	return Response(
		{
			'batch_id': batch_id,
			'employees_paid': len(paid),
			'total_paid': sum((t.amount for t in paid if t.status == WalletTransaction.Status.COMPLETED), Decimal('0')),
			'transactions': WalletTransactionSerializer(paid, many=True).data,
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

	transaction = _settle_payout(transaction)
	if transaction.status == WalletTransaction.Status.COMPLETED:
		notify_payout_completed(transaction)
	return Response(WalletTransactionSerializer(transaction).data, status=status.HTTP_200_OK)




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
