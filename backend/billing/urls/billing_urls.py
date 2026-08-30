
from django.urls import path

from billing.views import billing_views as views


urlpatterns = [
	path('api/v1/status/', views.billingStatus),

	path('api/v1/checkout/', views.createCheckoutSession),

	path('api/v1/customer_portal/', views.createCustomerPortalSession),

	path('api/v1/payout_card/status/', views.getPayoutCardStatus),
	path('api/v1/payout_card/setup/', views.createPayoutCardSetupSession),
	path('api/v1/payout_card/confirm/', views.confirmPayoutCardSetup),

	path('api/v1/webhook/', views.stripeWebhook),

	path('api/v1/confirm/', views.confirmCheckout),

	path('api/v1/platform_settings/', views.platformSettings),

	path('api/v1/organization/settings/', views.updateOrganizationSettings),
]
