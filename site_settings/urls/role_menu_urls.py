
from django.urls import path

from site_settings.views import role_menu_views as views


urlpatterns = [

	path('api/v1/role_menu/all/', views.getAllRoleMenu),

	path('api/v1/role_menu/<int:pk>', views.getARoleMenu),

	path('api/v1/role_menu/create/', views.createRoleMenu),

	# path('api/v1/role_menu/update/<int:pk>', views.updateRoleMenu),
	
	path('api/v1/role_menu/delete/<int:role_id>', views.deleteRoleMenu),

]