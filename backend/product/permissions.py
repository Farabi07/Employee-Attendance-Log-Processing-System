from rest_framework import permissions

from authentication.permissions import HasActiveSubscription, IsManagerOrModerator


class CanManageProducts(permissions.BasePermission):
    def has_permission(self, request, view):
        return IsManagerOrModerator().has_permission(request, view) and HasActiveSubscription().has_permission(request, view)
