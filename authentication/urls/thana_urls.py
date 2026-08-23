
from django.urls import path
from authentication.views import thana_views as views


urlpatterns = [
	path('api/v1/thana/all/', views.getAllThana),

	path('api/v1/thana/without_pagination/all/', views.getAllThanaWithoutPagination),

	path('api/v1/thana/all_thana_by_city_id/<str:city_id>', views.getAllThanaByCityIdWithoutPagination),

	path('api/v1/thana/<int:pk>', views.getAThana),

	path('api/v1/thana/search/', views.searchThana),

	path('api/v1/thana/create/', views.createThana),

	path('api/v1/thana/update/<int:pk>', views.updateThana),

	path('api/v1/thana/delete/<int:pk>', views.deleteThana),

]