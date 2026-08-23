
from django.urls import path
from authentication.views import customer_views as views


urlpatterns = [
	path('api/v1/customer/all/', views.getAllCustomer),

	path('api/v1/customer/without_pagination/all/', views.getAllCustomerWithoutPagination),

	path('api/v1/customer/<int:pk>', views.getACustomer),

	path('api/v1/customer/search/', views.searchCustomer),

	path('api/v1/customer/create/', views.createCustomer),

	path('api/v1/customer/update/<int:pk>', views.updateCustomer),

	path('api/v1/customer/delete/<int:pk>', views.deleteCustomer),

]