from attendance.models import Notification


def notify_payout_completed(transaction):
	Notification.objects.create(
		recipient=transaction.employee,
		notification_type=Notification.NotificationType.GENERAL,
		title="Payout sent",
		message=f"${transaction.amount} has been paid out to you.",
	)


def notify_payout_failed(transaction):
	from authentication.models import User

	message = f"Payout of ${transaction.amount} for {transaction.employee.first_name} {transaction.employee.last_name} failed: {transaction.failure_reason}"

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
