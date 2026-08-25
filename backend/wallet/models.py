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
