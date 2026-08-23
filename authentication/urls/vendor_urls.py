
from django.urls import path
from authentication.views import vendor_views as views


urlpatterns = [
	path('api/v1/vendor/all/', views.getAllVendor),

	path('api/v1/vendor/without_pagination/all/', views.getAllVendorWithoutPagination),

	path('api/v1/vendor/<int:pk>', views.getAVendor),

	path('api/v1/vendor/search/', views.searchVendor),

	path('api/v1/vendor/create/', views.createVendor),

	path('api/v1/vendor/update/<int:pk>', views.updateVendor),
	
	path('api/v1/vendor/delete/<int:pk>', views.deleteVendor),
]