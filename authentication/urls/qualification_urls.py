
from django.urls import path
from authentication.views import qualification_views as views


urlpatterns = [
	path('api/v1/qualification/all/', views.getAllQualification),

	path('api/v1/qualification/without_pagination/all/', views.getAllQualificationWithoutPagination),

	path('api/v1/qualification/<int:pk>', views.getAQualification),

	path('api/v1/qualification/search/', views.searchQualification),

	path('api/v1/qualification/create/', views.createQualification),

	path('api/v1/qualification/update/<int:pk>', views.updateQualification),

	path('api/v1/qualification/delete/<int:pk>', views.deleteQualification),

]