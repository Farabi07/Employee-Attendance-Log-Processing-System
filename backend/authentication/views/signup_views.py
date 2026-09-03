from django.db import transaction

from rest_framework import status
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework.response import Response
from rest_framework_simplejwt.tokens import RefreshToken

from drf_spectacular.utils import extend_schema

from authentication.models import Organization, Employee, User, Role
from authentication.permissions import IsPlatformOwner




@extend_schema(request=None, responses=None)
@api_view(['POST'])
@permission_classes([AllowAny])
def signupOrganization(request):
	data = request.data

	organization_name = data.get('organization_name', '').strip()
	first_name = data.get('first_name', '').strip()
	last_name = data.get('last_name', '').strip()
	email = data.get('email', '').strip()
	password = data.get('password', '')
	gender = data.get('gender', Employee.Gender.MALE)

	missing = [f for f, v in [('organization_name', organization_name), ('first_name', first_name), ('last_name', last_name), ('email', email), ('password', password)] if not v]
	if missing:
		return Response({'detail': f"Missing required field(s): {', '.join(missing)}"}, status=status.HTTP_400_BAD_REQUEST)

	if User.objects.filter(email__iexact=email).exists():
		return Response({'detail': 'An account with this email already exists — sign in instead, or use a different email to start a new trial.'}, status=status.HTTP_400_BAD_REQUEST)

	with transaction.atomic():
		organization = Organization.objects.create(name=organization_name, trial_ends_at=None)

		owner = Employee(
			first_name=first_name,
			last_name=last_name,
			email=email.lower(),
			gender=gender,
			organization=organization,
			role=Role.objects.get(name='MANAGER'),
		)
		owner.set_password(password)
		owner.save()

		organization.owner = owner
		organization.save()

	refresh = RefreshToken.for_user(owner)
	return Response(
		{
			'access': str(refresh.access_token),
			'refresh': str(refresh),
			'organization': {
				'id': organization.id,
				'name': organization.name,
				'trial_ends_at': organization.trial_ends_at,
				'subscription_status': organization.subscription_status,
			},
		},
		status=status.HTTP_201_CREATED,
	)




@extend_schema(request=None, responses=None)
@api_view(['GET'])
@permission_classes([IsPlatformOwner])
def listOrganizations(request):
	organizations = Organization.objects.all().order_by('-created_at')
	data = [
		{
			'id': org.id,
			'name': org.name,
			'owner_email': org.owner.email if org.owner else None,
			'subscription_status': org.subscription_status,
			'plan': org.plan,
			'expires_at': org.expires_at(),
			'created_at': org.created_at,
			'member_count': org.members.count(),
			'payout_commission_percent': org.payout_commission_percent,
			'effective_commission_percent': org.effective_commission_percent(),
		}
		for org in organizations
	]
	return Response({'organizations': data}, status=status.HTTP_200_OK)




@extend_schema(request=None, responses=None)
@api_view(['PUT'])
@permission_classes([IsPlatformOwner])
def updateOrganizationCommission(request, pk):
	"""Platform-owner-only override of one store's payout commission —
	null clears the override back to the platform-wide default."""
	try:
		org = Organization.objects.get(pk=pk)
	except Organization.DoesNotExist:
		return Response({'detail': 'Store not found'}, status=status.HTTP_404_NOT_FOUND)

	if 'payout_commission_percent' not in request.data:
		return Response({'detail': 'payout_commission_percent is required'}, status=status.HTTP_400_BAD_REQUEST)

	value = request.data['payout_commission_percent']
	org.payout_commission_percent = None if value in (None, '') else value
	org.save(update_fields=['payout_commission_percent'])

	return Response(
		{
			'id': org.id,
			'payout_commission_percent': org.payout_commission_percent,
			'effective_commission_percent': org.effective_commission_percent(),
		},
		status=status.HTTP_200_OK,
	)
