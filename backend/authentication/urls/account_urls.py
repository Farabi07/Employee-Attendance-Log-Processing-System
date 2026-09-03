from authentication.views import account_views as views
from django.urls import path

urlpatterns = [
	path('api/v1/deactivate/', views.deactivateMyAccount),
	path('api/v1/reactivate/<int:pk>/', views.reactivateAccount),
]
