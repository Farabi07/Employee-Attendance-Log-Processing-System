
from django.urls import path

from site_settings.views import menu_item_views as views




urlpatterns = [

	path('api/v1/menu_item/all/', views.getAllMenuItem),

	path('api/v1/menu_item/without_pagination/all/', views.getAllMenuItemWithoutPagination),


	path('api/v1/menu_item/nested_menu_item_without_pagination/all/', views.getAllNestedMenuItemWithoutPagination),


	path('api/v1/menu_item/nested_menu_item_by_user_role/', views.getAllNestedMenuItemByUserRole),  # for sidebar

	path('api/v1/menu_item/nested_menu_item_by_role_id/<str:role_id>', views.getAllNestedMenuItemByRoleId), 


	path('api/v1/menu_item/<int:pk>', views.getAMenuItem),


	path('api/v1/menu_item/search/', views.searchMenuItem),


	path('api/v1/menu_item/create/', views.createMenuItem),

	path('api/v1/menu_item/update/<int:pk>', views.updateMenuItem),
	
	path('api/v1/menu_item/delete/<int:pk>', views.deleteMenuItem),

]