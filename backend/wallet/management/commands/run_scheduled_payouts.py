import uuid
from decimal import Decimal

from django.core.management.base import BaseCommand

from authentication.models import Employee, Organization
from wallet.models import WalletTransaction, wallet_balance, is_payout_due
from wallet.notify import notify_payout_completed


class Command(BaseCommand):
	"""Settles wallet balances that are actually due, per employee — each
	employee has their own payout_cycle (weekly / every 2 weeks / monthly,
	set by their manager and changeable any time), so this only pays out
	whoever has reached their own next due date. Meant to run daily via
	cron, not weekly:

	0 20 * * * /path/to/backend/env/bin/python /path/to/backend/manage.py run_scheduled_payouts
	"""

	help = "Pays out every employee whose own payout cycle is due today, across all organizations."

	def handle(self, *args, **options):
		from wallet.views.wallet_views import _settle_payout

		total_orgs = 0
		total_paid = Decimal('0')
		total_employees = 0

		for organization in Organization.objects.filter(subscription_status__in=[Organization.SubscriptionStatus.ACTIVE, Organization.SubscriptionStatus.TRIALING]):
			batch_id = uuid.uuid4()
			org_paid = False

			for employee in Employee.objects.filter(organization=organization):
				if not is_payout_due(employee):
					continue

				balance = wallet_balance(employee)
				transaction = WalletTransaction.objects.create(
					employee=employee,
					organization=organization,
					type=WalletTransaction.Type.PAYOUT,
					status=WalletTransaction.Status.PENDING,
					amount=balance,
					batch_id=batch_id,
					note=f"Scheduled {employee.payout_cycle} payout",
				)
				transaction = _settle_payout(transaction)
				if transaction.status == WalletTransaction.Status.COMPLETED:
					notify_payout_completed(transaction)
					total_paid += transaction.amount
					total_employees += 1
					org_paid = True

			if org_paid:
				total_orgs += 1

		self.stdout.write(self.style.SUCCESS(
			f"Scheduled payouts complete: {total_employees} employees paid across {total_orgs} organizations, total ${total_paid}."
		))
