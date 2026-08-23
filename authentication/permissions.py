from rest_framework import permissions

class AllowedPermission(permissions.BasePermission):
		"""
		Global permission check for blocked IPs.
		"""

		def has_permission(self, request, view):
			# role = request.user.role
			pass