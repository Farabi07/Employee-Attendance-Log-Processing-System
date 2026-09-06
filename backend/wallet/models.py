import uuid

from django.conf import settings
from django.db import models
from django.db.models import Sum
from django.utils import timezone
from django.utils.translation import gettext_lazy as _


class WalletTransaction(models.Model):
	"""Immutable ledger entry. A wallet's balance is never stored directly —
	it's always derived by summing these rows, so the numbers can never
	drift out of sync with what actually happened."""

	class Type(models.TextChoices):
		EARNING = 'earning', _('Earning')
		PAYOUT = 'payout', _('Payout')

	class Status(models.TextChoices):
		PENDING = 'pending', _('Pending')
		# Manager has handed over cash and marked it paid, but the payout only
		# counts as settled once the employee confirms they actually got it —
		# unlike Stripe, there's no third party confirming the money moved.
		AWAITING_CASH_CONFIRMATION = 'awaiting_confirmation', _('Awaiting employee confirmation')
		COMPLETED = 'completed', _('Completed')
		FAILED = 'failed', _('Failed')

	class PayoutMethod(models.TextChoices):
		STRIPE = 'stripe', _('Stripe')
		CASH = 'cash', _('Cash')

	transaction_id = models.UUIDField(default=uuid.uuid4, unique=True, editable=False)

	employee = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name='wallet_transactions')
	organization = models.ForeignKey('authentication.Organization', on_delete=models.CASCADE, related_name='wallet_transactions')

	type = models.CharField(max_length=20, choices=Type.choices)
	status = models.CharField(max_length=25, choices=Status.choices, default=Status.COMPLETED, db_index=True)
	amount = models.DecimalField(max_digits=10, decimal_places=2)

	related_attendance = models.ForeignKey('attendance.Attendance', on_delete=models.SET_NULL, null=True, blank=True, related_name='wallet_transactions')
	batch_id = models.UUIDField(null=True, blank=True)

	# Only meaningful for PAYOUT rows — which of the two settlement paths
	# this went through. Null for older payouts recorded before this field
	# existed, and for EARNING rows (which are never "paid out" themselves).
	payout_method = models.CharField(max_length=20, choices=PayoutMethod.choices, null=True, blank=True)

	stripe_transfer_id = models.CharField(max_length=255, null=True, blank=True)
	failure_reason = models.TextField(null=True, blank=True)
	note = models.CharField(max_length=255, null=True, blank=True)

	created_by = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.SET_NULL, null=True, blank=True, related_name='wallet_transactions_created')
	created_at = models.DateTimeField(auto_now_add=True)
	processed_at = models.DateTimeField(null=True, blank=True)

	class Meta:
		ordering = ('-created_at',)

	def __str__(self):
		return f"{self.employee} · {self.type} · {self.amount} · {self.status}"

	def mark_completed(self):
		self.status = self.Status.COMPLETED
		self.processed_at = timezone.now()
		self.save()

	def mark_failed(self, reason):
		self.status = self.Status.FAILED
		self.failure_reason = reason
		self.processed_at = timezone.now()
		self.save()


class RateHistory(models.Model):
	"""One row per hourly-rate (or currency) change — a raise after a good
	month, a cut, whatever. Visible to both the employee and whoever manages
	pay for the store, so nobody has to just take someone's word for when
	and by how much it changed."""

	employee = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name='rate_history')
	organization = models.ForeignKey('authentication.Organization', on_delete=models.CASCADE, related_name='rate_history')

	old_hourly_rate = models.DecimalField(max_digits=10, decimal_places=2, null=True, blank=True)
	new_hourly_rate = models.DecimalField(max_digits=10, decimal_places=2)
	old_currency = models.CharField(max_length=10, null=True, blank=True)
	new_currency = models.CharField(max_length=10)

	changed_by = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.SET_NULL, null=True, blank=True, related_name='rate_changes_made')
	created_at = models.DateTimeField(auto_now_add=True)

	class Meta:
		ordering = ('-created_at',)
		verbose_name_plural = 'Rate histories'

	def __str__(self):
		return f"{self.employee} · {self.old_hourly_rate} -> {self.new_hourly_rate} {self.new_currency}"


def record_rate_change(employee, old_rate, new_rate, old_currency, new_currency, changed_by):
	"""Logs the change and returns the new RateHistory row — or None if
	neither the rate nor the currency actually changed."""
	if new_rate is None:
		return None
	if old_rate == new_rate and old_currency == new_currency:
		return None
	return RateHistory.objects.create(
		employee=employee,
		organization=employee.organization,
		old_hourly_rate=old_rate,
		new_hourly_rate=new_rate,
		old_currency=old_currency,
		new_currency=new_currency,
		changed_by=changed_by,
	)


def wallet_balance(employee):
	"""Money earned but not yet paid out or requested — what the employee
	can actually cash out right now."""
	earnings = WalletTransaction.objects.filter(
		employee=employee, type=WalletTransaction.Type.EARNING, status=WalletTransaction.Status.COMPLETED
	).aggregate(s=Sum('amount'))['s'] or 0

	outgoing = WalletTransaction.objects.filter(
		employee=employee,
		type=WalletTransaction.Type.PAYOUT,
		status__in=[
			WalletTransaction.Status.PENDING,
			WalletTransaction.Status.AWAITING_CASH_CONFIRMATION,
			WalletTransaction.Status.COMPLETED,
		],
	).aggregate(s=Sum('amount'))['s'] or 0

	return earnings - outgoing


def wallet_pending_payout(employee):
	"""Money that's already been requested/queued for payout but hasn't
	settled to the employee's bank (or hand) yet."""
	return WalletTransaction.objects.filter(
		employee=employee,
		type=WalletTransaction.Type.PAYOUT,
		status__in=[WalletTransaction.Status.PENDING, WalletTransaction.Status.AWAITING_CASH_CONFIRMATION],
	).aggregate(s=Sum('amount'))['s'] or 0


PAYOUT_CYCLE_DAYS = {
	'weekly': 7,
	'biweekly': 14,
	'monthly': 30,
}


def last_payout_at(employee):
	last = WalletTransaction.objects.filter(
		employee=employee, type=WalletTransaction.Type.PAYOUT, status=WalletTransaction.Status.COMPLETED
	).order_by('-processed_at').first()
	return last.processed_at if last else None


def next_payout_due_at(employee):
	"""When this employee's next scheduled settlement is due, based on
	their own payout cycle — set by the manager and changeable any time,
	e.g. after a raise or a change in how often they want to be paid."""
	if employee.payout_cycle == 'hourly':
		return None  # settles instantly at every check-out — no schedule to wait on
	cycle_days = PAYOUT_CYCLE_DAYS.get(employee.payout_cycle, 7)
	last = last_payout_at(employee)
	if last is None:
		return None  # never paid yet — due as soon as there's a balance
	return last + timezone.timedelta(days=cycle_days)


def is_payout_due(employee):
	if wallet_balance(employee) <= 0:
		return False
	due_at = next_payout_due_at(employee)
	return due_at is None or timezone.now() >= due_at


def pay_adjustment_upload_path(instance, filename):
	return f'pay_adjustment_attachments/org_{instance.organization_id}/{instance.employee_id}_{filename}'


class PayAdjustmentRequest(models.Model):
	"""A claim on the hours check-out left aside — either overtime worked
	beyond the day's scheduled shift, or the shortfall from leaving before
	it ended. Nothing here touches the wallet until the employee accepts
	whatever the Manager ends up granting, which can be the full amount,
	a partial one, or nothing."""

	class Kind(models.TextChoices):
		OVERTIME = 'overtime', _('Overtime')
		SHORTFALL = 'shortfall', _('Shortfall')

	class Status(models.TextChoices):
		PENDING = 'pending', _('Pending')      # waiting on the Manager
		REVIEWED = 'reviewed', _('Reviewed')    # Manager decided, waiting on the employee
		ACCEPTED = 'accepted', _('Accepted')    # employee accepted — paid out

	employee = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name='pay_adjustment_requests')
	organization = models.ForeignKey('authentication.Organization', on_delete=models.CASCADE, related_name='pay_adjustment_requests')
	attendance = models.ForeignKey('attendance.Attendance', on_delete=models.CASCADE, related_name='pay_adjustment_requests')

	kind = models.CharField(max_length=20, choices=Kind.choices)
	hours = models.DecimalField(max_digits=5, decimal_places=2)
	requested_amount = models.DecimalField(max_digits=10, decimal_places=2)

	note = models.TextField(null=True, blank=True)
	attachment = models.FileField(upload_to=pay_adjustment_upload_path, null=True, blank=True)

	status = models.CharField(max_length=20, choices=Status.choices, default=Status.PENDING, db_index=True)
	granted_amount = models.DecimalField(max_digits=10, decimal_places=2, null=True, blank=True)
	manager_note = models.TextField(null=True, blank=True)

	reviewed_by = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.SET_NULL, null=True, blank=True, related_name='pay_adjustments_reviewed')
	reviewed_at = models.DateTimeField(null=True, blank=True)
	accepted_at = models.DateTimeField(null=True, blank=True)

	created_at = models.DateTimeField(auto_now_add=True)

	class Meta:
		ordering = ('-created_at',)

	def __str__(self):
		return f"{self.employee} · {self.kind} · {self.hours}h · {self.status}"
