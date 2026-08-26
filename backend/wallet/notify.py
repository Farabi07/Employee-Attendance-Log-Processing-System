from attendance.models import Notification
from commons.currencies import CURRENCY_SYMBOLS


def _money(amount, currency):
	return f"{CURRENCY_SYMBOLS.get(currency, '$')}{amount}"


def notify_rate_changed(rate_history):
	old = rate_history.old_hourly_rate
	new_label = f"{_money(rate_history.new_hourly_rate, rate_history.new_currency)}/hour"

	if old is None:
		message = f"Your pay rate has been set to {new_label}."
	elif rate_history.new_hourly_rate > old:
		message = f"Good news — your pay rate went up to {new_label} (was {_money(old, rate_history.old_currency)}/hour)."
	elif rate_history.new_hourly_rate < old:
		message = f"Your pay rate has changed to {new_label} (was {_money(old, rate_history.old_currency)}/hour)."
	else:
		message = f"Your pay currency has changed — still {new_label}, now paid in {rate_history.new_currency.upper()}."

	Notification.objects.create(
		recipient=rate_history.employee,
		notification_type=Notification.NotificationType.RATE_CHANGED,
		title="Pay rate updated",
		message=message,
	)


def notify_payout_completed(transaction):
	from authentication.models import Employee

	currency = Employee.objects.filter(pk=transaction.employee_id).values_list('currency', flat=True).first()
	Notification.objects.create(
		recipient=transaction.employee,
		notification_type=Notification.NotificationType.GENERAL,
		title="Payout sent",
		message=f"{_money(transaction.amount, currency)} has been paid out to you.",
	)


def notify_payout_failed(transaction):
	from authentication.models import User, Employee

	currency = Employee.objects.filter(pk=transaction.employee_id).values_list('currency', flat=True).first()
	message = f"Payout of {_money(transaction.amount, currency)} for {transaction.employee.first_name} {transaction.employee.last_name} failed: {transaction.failure_reason}"

	managers = User.objects.filter(
		organization=transaction.organization,
		org_role__in=[User.OrgRole.MANAGER, User.OrgRole.MODERATOR],
	)
	Notification.objects.bulk_create(
		[
			Notification(
				recipient=manager,
				notification_type=Notification.NotificationType.GENERAL,
				title="Payout failed",
				message=message,
			)
			for manager in managers
		]
	)
