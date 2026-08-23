
from django.urls import path
from authentication.views import customer_type_views as views


urlpatterns = [
	path('api/v1/customer_type/all/', views.getAllCustomerType),

	path('api/v1/customer_type/<int:pk>', views.getACustomerType),

	path('api/v1/customer_type/search/', views.searchCustomerType),

	path('api/v1/customer_type/create/', views.createCustomerType),

	path('api/v1/customer_type/update/<int:pk>', views.updateCustomerType),

	path('api/v1/customer_type/delete/<int:pk>', views.deleteCustomerType),

]