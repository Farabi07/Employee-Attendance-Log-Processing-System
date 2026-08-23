
from django.urls import path

from site_settings.views import contact_views as views


urlpatterns = [
	path('api/v1/contact/all/', views.getAllContact),

	path('api/v1/contact/<int:pk>', views.getAContact),

	path('api/v1/contact/create/', views.createContact),

	path('api/v1/contact/update/<int:pk>', views.updateContact),
	
	path('api/v1/contact/delete/<int:pk>', views.deleteContact),
]