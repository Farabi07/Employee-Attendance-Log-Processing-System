
from django.urls import path
from authentication.views import area_views as views


urlpatterns = [
	path('api/v1/area/all/', views.getAllArea),

	path('api/v1/area/without_pagination/all/', views.getAllAreaWithoutPagination),

	path('api/v1/area/<int:pk>', views.getAArea),

	path('api/v1/area/search/', views.searchArea),

	path('api/v1/area/create/', views.createArea),

	path('api/v1/area/update/<int:pk>', views.updateArea),

	path('api/v1/area/delete/<int:pk>', views.deleteArea),

]