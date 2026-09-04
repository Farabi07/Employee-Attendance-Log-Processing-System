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


def notify_swap_requested(swap):
    """A specific colleague was named — tell them there's a shift waiting
    on their answer. Open requests (proposed_to is None) have no single
    recipient here — the roster/shift-swap board itself is the notice."""
    if not swap.proposed_to_id:
        return
    requester_name = f"{swap.requested_by.first_name} {swap.requested_by.last_name}"
    shift_label = swap.roster.shift.name if swap.roster.shift else "a shift"
    Notification.objects.create(
        recipient=swap.proposed_to,
        notification_type=Notification.NotificationType.SWAP_REQUESTED,
        title="Shift swap requested",
        message=f"{requester_name} wants you to take their {shift_label} on {swap.roster.date}.",
    )


def notify_swap_claimed(swap):
    """A peer accepted/claimed the shift — tell the managers/moderators
    who need to give the final approval."""
    from authentication.models import User

    claimer_name = f"{swap.claimed_by.first_name} {swap.claimed_by.last_name}"
    requester_name = f"{swap.requested_by.first_name} {swap.requested_by.last_name}"
    managers = User.objects.filter(
        organization=swap.requested_by.organization,
        role__name__in=['MANAGER', 'MODERATOR'],
    )
    created = Notification.objects.bulk_create(
        [
            Notification(
                recipient=manager,
                notification_type=Notification.NotificationType.SWAP_CLAIMED,
                title="Shift swap needs approval",
                message=f"{claimer_name} agreed to take {requester_name}'s shift on {swap.roster.date} — approve to finalize.",
            )
            for manager in managers
        ]
    )
    for notification in created:
        send_expo_push_for_notification(notification)


def notify_swap_reviewed(swap):
    """Manager decided — tell both the original owner and whoever's taking
    over (if approved; on rejection there's no new owner to notify)."""
    verb = "approved" if swap.status == swap.Status.APPROVED else "rejected"
    Notification.objects.create(
        recipient=swap.requested_by,
        notification_type=Notification.NotificationType.SWAP_REVIEWED,
        title=f"Shift swap {verb}",
        message=f"Your swap request for {swap.roster.date} was {verb}.",
    )
    if swap.status == swap.Status.APPROVED and swap.claimed_by_id and swap.claimed_by_id != swap.requested_by_id:
        Notification.objects.create(
            recipient=swap.claimed_by,
            notification_type=Notification.NotificationType.SWAP_REVIEWED,
            title="Shift swap approved",
            message=f"You're now scheduled for {swap.roster.date}, taken over from {swap.requested_by.first_name}.",
        )
