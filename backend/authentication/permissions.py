from rest_framework import permissions

class AllowedPermission(permissions.BasePermission):
		"""
		Global permission check for blocked IPs.
		"""

		def has_permission(self, request, view):
			# role = request.user.role
			pass




class IsManager(permissions.BasePermission):
	"""Store Manager only (the org owner / full-control role)."""

	def has_permission(self, request, view):
		user = request.user
		return bool(user and user.is_authenticated and user.is_manager())




class IsManagerOrModerator(permissions.BasePermission):
	"""Store Manager or Moderator — everything except employee/moderator
	creation and branch QR management, which stay Manager-only."""

	def has_permission(self, request, view):
		user = request.user
		return bool(user and user.is_authenticated and user.is_manager_or_moderator())




class CanAddEmployees(permissions.BasePermission):
	"""Manager always; Moderator only if the store's Manager has turned on
	'moderators can add employees' for this store."""

	def has_permission(self, request, view):
		user = request.user
		return bool(user and user.is_authenticated and user.can_add_employees())




class CanManageSubscription(permissions.BasePermission):
	"""Manager always; Moderator only if the store's Manager has turned on
	'moderators can manage subscription' for this store."""

	def has_permission(self, request, view):
		user = request.user
		return bool(user and user.is_authenticated and user.can_manage_subscription())




class IsPlatformOwner(permissions.BasePermission):
	"""The SaaS platform owner — an admin account with no organization."""

	def has_permission(self, request, view):
		user = request.user
		return bool(user and user.is_authenticated and user.is_platform_owner())




class HasActiveSubscription(permissions.BasePermission):
	"""Blocks all store-side app usage once a trial has expired and no
	subscription is active. The platform owner (no organization) is exempt."""

	message = "Your free trial has ended. Please subscribe to continue."

	def has_permission(self, request, view):
		user = request.user
		if not (user and user.is_authenticated):
			return False
		if user.is_platform_owner():
			return True
		org = user.organization
		if org is None:
			return False
		return org.has_active_access()