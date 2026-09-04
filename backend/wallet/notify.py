from attendance.models import Notification
from attendance.push import send_expo_push_for_notification
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


def notify_pay_adjustment_submitted(request_obj):
	"""Employee submitted an overtime/shortfall claim — every Manager and
	Moderator in the store needs to know there's something to review."""
	from authentication.models import User, Employee

	kind_label = "overtime" if request_obj.kind == request_obj.Kind.OVERTIME else "shortfall"
	# request_obj.employee is a plain User (the FK targets AUTH_USER_MODEL) —
	# currency only exists on the Employee subclass, so it has to be looked
	# up explicitly rather than read straight off the FK.
	employee = Employee.objects.get(pk=request_obj.employee_id)
	message = (
		f"{employee.first_name} {employee.last_name} is claiming {request_obj.hours}h of {kind_label} "
		f"({_money(request_obj.requested_amount, employee.currency)}) for {request_obj.attendance.date}."
	)
	managers = User.objects.filter(
		organization=request_obj.organization,
		role__name__in=['MANAGER', 'MODERATOR'],
	)
	# bulk_create bypasses the post_save signal that normally fires a push
	# (attendance/signals.py) — so each row's push is sent explicitly here.
	created = Notification.objects.bulk_create(
		[
			Notification(
				recipient=manager,
				notification_type=Notification.NotificationType.PAY_ADJUSTMENT_SUBMITTED,
				title="Pay adjustment requested",
				message=message,
			)
			for manager in managers
		]
	)
	for notification in created:
		send_expo_push_for_notification(notification)


def notify_pay_adjustment_reviewed(request_obj):
	"""Manager decided on a claim — tell the employee exactly what was
	granted so they know what they're accepting."""
	from authentication.models import Employee

	currency = Employee.objects.filter(pk=request_obj.employee_id).values_list('currency', flat=True).first()
	granted = request_obj.granted_amount or 0
	if granted >= request_obj.requested_amount:
		message = f"Your {request_obj.hours}h claim was fully approved — {_money(granted, currency)}. Accept it to add it to your balance."
	elif granted > 0:
		message = f"Your {request_obj.hours}h claim was partially approved — {_money(granted, currency)} of {_money(request_obj.requested_amount, currency)} requested. Accept it to add it to your balance."
	else:
		message = f"Your {request_obj.hours}h claim wasn't approved this time. You can submit a new request if you'd like to try again."
	if request_obj.manager_note:
		message += f' Note from your manager: "{request_obj.manager_note}"'

	Notification.objects.create(
		recipient=request_obj.employee,
		notification_type=Notification.NotificationType.PAY_ADJUSTMENT_REVIEWED,
		title="Pay adjustment reviewed",
		message=message,
	)


def notify_cash_payout_pending(transaction):
	"""Manager marked a payout request as 'paying with cash' — the employee
	needs to confirm they actually received it before it counts as settled."""
	from authentication.models import Employee

	# transaction.employee is a plain User (the FK targets AUTH_USER_MODEL) —
	# currency only exists on the Employee subclass, so it has to be looked
	# up explicitly rather than read straight off the FK.
	currency = Employee.objects.filter(pk=transaction.employee_id).values_list('currency', flat=True).first()
	Notification.objects.create(
		recipient=transaction.employee,
		notification_type=Notification.NotificationType.CASH_PAYOUT_PENDING,
		title="Cash payout — please confirm",
		message=f"Your manager marked {_money(transaction.amount, currency)} as paid in cash. Confirm in your Wallet once you've received it.",
	)


def notify_cash_payout_confirmed(transaction):
	"""Employee confirmed they received the cash — tell the managers/
	moderators who can see this so the payout is visibly closed out."""
	from authentication.models import User, Employee

	currency = Employee.objects.filter(pk=transaction.employee_id).values_list('currency', flat=True).first()
	employee_name = f"{transaction.employee.first_name} {transaction.employee.last_name}"
	managers = User.objects.filter(
		organization=transaction.organization,
		role__name__in=['MANAGER', 'MODERATOR'],
	)
	created = Notification.objects.bulk_create(
		[
			Notification(
				recipient=manager,
				notification_type=Notification.NotificationType.CASH_PAYOUT_CONFIRMED,
				title="Cash payout confirmed",
				message=f"{employee_name} confirmed receiving {_money(transaction.amount, currency)} in cash.",
			)
			for manager in managers
		]
	)
	for notification in created:
		send_expo_push_for_notification(notification)


def notify_payout_failed(transaction):
	from authentication.models import User, Employee

	currency = Employee.objects.filter(pk=transaction.employee_id).values_list('currency', flat=True).first()
	message = f"Payout of {_money(transaction.amount, currency)} for {transaction.employee.first_name} {transaction.employee.last_name} failed: {transaction.failure_reason}"

	managers = User.objects.filter(
		organization=transaction.organization,
		role__name__in=['MANAGER', 'MODERATOR'],
	)
	# bulk_create bypasses the post_save signal that normally fires a push
	# (attendance/signals.py) — so each row's push is sent explicitly here.
	created = Notification.objects.bulk_create(
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
	for notification in created:
		send_expo_push_for_notification(notification)
