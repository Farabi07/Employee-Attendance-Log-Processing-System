from django.conf import settings
from django.http import HttpResponse
from django.views.decorators.csrf import csrf_exempt

from rest_framework import status
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated, AllowAny
from rest_framework.response import Response

from drf_spectacular.utils import extend_schema

from authentication.permissions import IsManager
from authentication.models import Organization

try:
	import stripe
except ImportError:
	stripe = None




def _stripe_configured():
	return bool(stripe and getattr(settings, 'STRIPE_SECRET_KEY', None))




@extend_schema(request=None, responses=None)
@api_view(['GET'])
@permission_classes([IsAuthenticated])
def billingStatus(request):
	org = request.user.organization
	if org is None:
		return Response({'detail': 'This account has no organization'}, status=status.HTTP_400_BAD_REQUEST)

	return Response(
		{
			'organization_id': org.id,
			'organization_name': org.name,
			'subscription_status': org.subscription_status,
			'plan': org.plan,
			'trial_ends_at': org.trial_ends_at,
			'has_active_access': org.has_active_access(),
			'is_manager': request.user.is_manager(),
		},
		status=status.HTTP_200_OK,
	)




@extend_schema(request=None, responses=None)
@api_view(['POST'])
@permission_classes([IsManager])
def createCheckoutSession(request):
	if not _stripe_configured():
		return Response({'detail': 'Payments are not configured yet on this server.'}, status=status.HTTP_503_SERVICE_UNAVAILABLE)

	stripe.api_key = settings.STRIPE_SECRET_KEY
	org = request.user.organization
	plan = request.data.get('plan')
	price_id = {'monthly': settings.STRIPE_PRICE_MONTHLY, 'yearly': settings.STRIPE_PRICE_YEARLY}.get(plan)
	if not price_id:
		return Response({'detail': "plan must be 'monthly' or 'yearly'"}, status=status.HTTP_400_BAD_REQUEST)

	if not org.stripe_customer_id:
		customer = stripe.Customer.create(email=request.user.email, name=org.name)
		org.stripe_customer_id = customer.id
		org.save()

	session = stripe.checkout.Session.create(
		customer=org.stripe_customer_id,
		mode='subscription',
		line_items=[{'price': price_id, 'quantity': 1}],
		success_url=settings.BILLING_SUCCESS_URL,
		cancel_url=settings.BILLING_CANCEL_URL,
		metadata={'organization_id': str(org.id), 'plan': plan},
	)
	return Response({'checkout_url': session.url}, status=status.HTTP_200_OK)




@extend_schema(request=None, responses=None)
@api_view(['POST'])
@permission_classes([IsManager])
def createCustomerPortalSession(request):
	if not _stripe_configured():
		return Response({'detail': 'Payments are not configured yet on this server.'}, status=status.HTTP_503_SERVICE_UNAVAILABLE)

	stripe.api_key = settings.STRIPE_SECRET_KEY
	org = request.user.organization
	if not org.stripe_customer_id:
		return Response({'detail': 'No billing account yet — subscribe first.'}, status=status.HTTP_400_BAD_REQUEST)

	session = stripe.billing_portal.Session.create(customer=org.stripe_customer_id, return_url=settings.BILLING_RETURN_URL)
	return Response({'portal_url': session.url}, status=status.HTTP_200_OK)




STATUS_MAP = {
	'active': Organization.SubscriptionStatus.ACTIVE,
	'trialing': Organization.SubscriptionStatus.TRIALING,
	'past_due': Organization.SubscriptionStatus.PAST_DUE,
	'unpaid': Organization.SubscriptionStatus.PAST_DUE,
	'canceled': Organization.SubscriptionStatus.CANCELED,
	'incomplete_expired': Organization.SubscriptionStatus.CANCELED,
}


@csrf_exempt
@api_view(['POST'])
@permission_classes([AllowAny])
def stripeWebhook(request):
	if not _stripe_configured():
		return HttpResponse(status=503)

	stripe.api_key = settings.STRIPE_SECRET_KEY
	payload = request.body
	sig_header = request.META.get('HTTP_STRIPE_SIGNATURE')

	try:
		event = stripe.Webhook.construct_event(payload, sig_header, settings.STRIPE_WEBHOOK_SECRET)
	except (ValueError, stripe.error.SignatureVerificationError):
		return HttpResponse(status=400)

	obj = event['data']['object']
	event_type = event['type']

	if event_type == 'checkout.session.completed':
		metadata = obj.get('metadata') or {}
		org_id = metadata.get('organization_id')
		plan = metadata.get('plan')
		if org_id:
			update = {
				'subscription_status': Organization.SubscriptionStatus.ACTIVE,
				'stripe_subscription_id': obj.get('subscription'),
			}
			if plan in (Organization.Plan.MONTHLY, Organization.Plan.YEARLY):
				update['plan'] = plan
			Organization.objects.filter(pk=org_id).update(**update)

	elif event_type == 'customer.subscription.updated':
		customer_id = obj.get('customer')
		new_status = STATUS_MAP.get(obj.get('status'))
		if new_status:
			Organization.objects.filter(stripe_customer_id=customer_id).update(subscription_status=new_status)

	elif event_type == 'customer.subscription.deleted':
		customer_id = obj.get('customer')
		Organization.objects.filter(stripe_customer_id=customer_id).update(
			subscription_status=Organization.SubscriptionStatus.CANCELED
		)

	return HttpResponse(status=200)
