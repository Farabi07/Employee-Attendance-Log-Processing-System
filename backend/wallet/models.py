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
		COMPLETED = 'completed', _('Completed')
		FAILED = 'failed', _('Failed')

	transaction_id = models.UUIDField(default=uuid.uuid4, unique=True, editable=False)

	employee = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name='wallet_transactions')
	organization = models.ForeignKey('authentication.Organization', on_delete=models.CASCADE, related_name='wallet_transactions')

	type = models.CharField(max_length=20, choices=Type.choices)
	status = models.CharField(max_length=20, choices=Status.choices, default=Status.COMPLETED)
	amount = models.DecimalField(max_digits=10, decimal_places=2)

	related_attendance = models.ForeignKey('attendance.Attendance', on_delete=models.SET_NULL, null=True, blank=True, related_name='wallet_transactions')
	batch_id = models.UUIDField(null=True, blank=True)

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


def wallet_balance(employee):
	"""Money earned but not yet paid out or requested — what the employee
	can actually cash out right now."""
	earnings = WalletTransaction.objects.filter(
		employee=employee, type=WalletTransaction.Type.EARNING, status=WalletTransaction.Status.COMPLETED
	).aggregate(s=Sum('amount'))['s'] or 0

	outgoing = WalletTransaction.objects.filter(
		employee=employee,
		type=WalletTransaction.Type.PAYOUT,
		status__in=[WalletTransaction.Status.PENDING, WalletTransaction.Status.COMPLETED],
	).aggregate(s=Sum('amount'))['s'] or 0

	return earnings - outgoing


def wallet_pending_payout(employee):
	"""Money that's already been requested/queued for payout but hasn't
	settled to the employee's bank yet."""
	return WalletTransaction.objects.filter(
		employee=employee, type=WalletTransaction.Type.PAYOUT, status=WalletTransaction.Status.PENDING
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
