
from django.urls import path

from billing.views import billing_views as views


urlpatterns = [
	path('api/v1/status/', views.billingStatus),

	path('api/v1/checkout/', views.createCheckoutSession),

	path('api/v1/customer_portal/', views.createCustomerPortalSession),

	path('api/v1/webhook/', views.stripeWebhook),
]
