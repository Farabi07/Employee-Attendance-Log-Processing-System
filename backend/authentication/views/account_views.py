from django.core.exceptions import ObjectDoesNotExist

from rest_framework import status
from rest_framework.decorators import api_view, permission_classes, parser_classes
from rest_framework.parsers import MultiPartParser, FormParser, JSONParser
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response

from drf_spectacular.utils import extend_schema

from authentication.models import User
from authentication.permissions import IsManager

PROFILE_EDITABLE_FIELDS = [
	'first_name', 'last_name', 'primary_phone', 'secondary_phone',
	'street_address_one', 'street_address_two', 'postal_code',
]


def _serialize_profile(user):
	return {
		'id': user.id,
		'first_name': user.first_name,
		'last_name': user.last_name,
		'email': user.email,
		'primary_phone': str(user.primary_phone) if user.primary_phone else None,
		'secondary_phone': str(user.secondary_phone) if user.secondary_phone else None,
		'street_address_one': user.street_address_one,
		'street_address_two': user.street_address_two,
		'postal_code': user.postal_code,
		'image': user.image.url if user.image else None,
	}


@extend_schema(request=None, responses=None)
@api_view(['POST'])
@permission_classes([IsAuthenticated])
def registerPushToken(request):
	"""Called by the mobile app right after expo-notifications registration
	(on login/app-start). One token per user, overwritten each time —
	simplest v1, revisit multi-device support only if it's ever needed."""
	token = request.data.get('expo_push_token')
	if not token:
		return Response({'detail': 'expo_push_token is required'}, status=status.HTTP_400_BAD_REQUEST)
	request.user.expo_push_token = token
	request.user.save(update_fields=['expo_push_token'])
	return Response({'detail': 'Push token registered.'}, status=status.HTTP_200_OK)


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


@extend_schema(request=None, responses=None)
@api_view(['GET'])
@permission_classes([IsAuthenticated])
def getMyProfile(request):
	return Response(_serialize_profile(request.user), status=status.HTTP_200_OK)


@extend_schema(request=None, responses=None)
# Both methods on purpose: PUT works fine for the web app's fetch(), but
# React Native's Android networking layer has a long-standing bug where a
# PUT request with a multipart FormData body throws "Unsupported
# FormDataPart implementation" — POST with the exact same body works. The
# mobile app uses POST here; the web app keeps using PUT.
@api_view(['PUT', 'POST'])
@permission_classes([IsAuthenticated])
@parser_classes([MultiPartParser, FormParser, JSONParser])
def updateMyProfile(request):
	"""Self-service profile edit — name, contact details, and photo. Never
	touches email/org_role/organization/pay fields or is_admin: those stay
	Manager-only via updateEmployee, or are simply not editable at all."""
	user = request.user
	updated_fields = []

	for field in PROFILE_EDITABLE_FIELDS:
		if field in request.data and request.data[field] not in (None, ''):
			setattr(user, field, request.data[field])
			updated_fields.append(field)

	if 'image' in request.FILES:
		user.image = request.FILES['image']
		updated_fields.append('image')

	if updated_fields:
		user.save(update_fields=updated_fields)

	return Response(_serialize_profile(user), status=status.HTTP_200_OK)
