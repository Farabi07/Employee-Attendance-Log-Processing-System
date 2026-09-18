from rest_framework import permissions

from authentication.permissions import HasActiveSubscription, IsManagerOrModerator


class CanManageBusiness(permissions.BasePermission):
    """Store manager or moderator with an active subscription."""

    def has_permission(self, request, view):
        return (
            IsManagerOrModerator().has_permission(request, view)
            and HasActiveSubscription().has_permission(request, view)
        )
