
from django.urls import path

from authentication.views import signup_views as views


urlpatterns = [
	path('api/v1/signup/', views.signupOrganization),

	path('api/v1/organizations/', views.listOrganizations),
	path('api/v1/organizations/<int:pk>/commission/', views.updateOrganizationCommission),
]
