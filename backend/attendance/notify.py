from attendance.models import Notification
from attendance.push import send_expo_push_for_notification


def notify_roster_assigned(roster, updated=False):
    shift_label = roster.shift.name if roster.shift else "a shift"
    verb = "updated" if updated else "assigned"
    Notification.objects.create(
        recipient=roster.employee,
        notification_type=Notification.NotificationType.ROSTER_ASSIGNED,
        title=f"Shift {verb}",
        message=f"You've been {verb} to {shift_label} on {roster.date}.",
    )


def notify_leave_submitted(leave_request):
    from authentication.models import User

    managers = User.objects.filter(
        organization=leave_request.employee.organization,
        role__name__in=['MANAGER', 'MODERATOR'],
    )
    employee_name = f"{leave_request.employee.first_name} {leave_request.employee.last_name}"

    # bulk_create bypasses the post_save signal that normally fires a push
    # (attendance/signals.py) — so each row's push is sent explicitly here.
    created = Notification.objects.bulk_create(
        [
            Notification(
                recipient=manager,
                notification_type=Notification.NotificationType.LEAVE_SUBMITTED,
                title="New leave request",
                message=f"{employee_name} requested leave from {leave_request.start_date} to {leave_request.end_date}.",
            )
            for manager in managers
        ]
    )
    for notification in created:
        send_expo_push_for_notification(notification)


def notify_leave_reviewed(leave_request):
    Notification.objects.create(
        recipient=leave_request.employee,
        notification_type=Notification.NotificationType.LEAVE_REVIEWED,
        title=f"Leave {leave_request.status}",
        message=f"Your leave request ({leave_request.start_date} to {leave_request.end_date}) was {leave_request.status}.",
    )
