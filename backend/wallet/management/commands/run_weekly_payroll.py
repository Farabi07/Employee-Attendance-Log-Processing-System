import uuid
from decimal import Decimal

from django.core.management.base import BaseCommand

from authentication.models import Employee, Organization
from wallet.models import WalletTransaction, wallet_balance
from wallet.notify import notify_payout_completed


class Command(BaseCommand):
	"""Pays out every organization's full wallet balances in one run.
	Not scheduled automatically — wire this to a cron entry, e.g. to run
	every Sunday at 20:00:

	0 20 * * 0 /path/to/backend/env/bin/python /path/to/backend/manage.py run_weekly_payroll
	"""

	help = "Runs weekly payroll for every organization: pays out each employee's full wallet balance."

	def handle(self, *args, **options):
		from wallet.views.wallet_views import _settle_payout

		total_orgs = 0
		total_paid = Decimal('0')
		total_employees = 0

		for organization in Organization.objects.filter(subscription_status__in=[Organization.SubscriptionStatus.ACTIVE, Organization.SubscriptionStatus.TRIALING]):
			batch_id = uuid.uuid4()
			org_paid = False

			for employee in Employee.objects.filter(organization=organization):
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
					note='Automated weekly payroll',
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
			f"Weekly payroll complete: {total_employees} employees paid across {total_orgs} organizations, total ${total_paid}."
		))
