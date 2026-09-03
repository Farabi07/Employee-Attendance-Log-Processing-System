from django.core.exceptions import ObjectDoesNotExist

from rest_framework import status
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response

from drf_spectacular.utils import extend_schema

from authentication.models import User
from authentication.permissions import IsManager


@extend_schema(request=None, responses=None)
@api_view(['POST'])
@permission_classes([IsAuthenticated])
def deactivateMyAccount(request):
	"""Self-service account deletion (soft-delete, required by Apple
	guideline 5.1.1(v)). Sets is_active=False rather than actually
	deleting the row: WalletTransaction/Attendance/etc. all reference
	this user, and payroll/tax records need to survive account closure.
	Django's ModelBackend and SIMPLE_JWT's default_user_authentication_rule
	both already reject is_active=False users at login, and
	JWTAuthentication.get_user() rejects an already-issued token on the
	very next request — so this alone is enough to fully lock the
	account out, no token blacklisting needed."""
	request.user.is_active = False
	request.user.save(update_fields=['is_active'])
	return Response({'detail': 'Your account has been deactivated.'}, status=status.HTTP_200_OK)


@extend_schema(request=None, responses=None)
@api_view(['POST'])
@permission_classes([IsManager])
def reactivateAccount(request, pk):
	"""Reverses deactivateMyAccount — a manager (or the platform owner,
	who has no organization and so isn't scoped by it) can restore an
	employee who deactivated their own account by mistake, or one that
	was deactivated as an offboarding step."""
	try:
		target = User.objects.get(pk=pk)
	except ObjectDoesNotExist:
		return Response({'detail': f"User id - {pk} doesn't exist"}, status=status.HTTP_404_NOT_FOUND)

	if not request.user.is_admin and target.organization_id != request.user.organization_id:
		return Response({'detail': 'This account belongs to a different store.'}, status=status.HTTP_403_FORBIDDEN)

	target.is_active = True
	target.save(update_fields=['is_active'])
	return Response({'detail': f'{target.first_name} {target.last_name} has been reactivated.'}, status=status.HTTP_200_OK)
