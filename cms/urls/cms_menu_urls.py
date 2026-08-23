
from django.urls import path

from cms.views import cms_menu_views as views


urlpatterns = [
	path('api/v1/cms_menu/all/', views.getAllCMSMenu),

	path('api/v1/cms_menu/without_pagination/all/', views.getAllCMSMenuWithoutPagination),

	path('api/v1/cms_menu/get_all_nested_cms_menu/', views.getAllNestedCMSMenu),

	path('api/v1/cms_menu/get_all_menu_content_and_image_by_cms_menu_id/<int:menu_id>', views.getAllCMSMenuContentAndImageByMenuId),

	path('api/v1/cms_menu/<int:pk>', views.getACMSMenu),

	path('api/v1/cms_menu/create/', views.createCMSMenu),

	path('api/v1/cms_menu/update/<int:pk>', views.updateCMSMenu),
	
	path('api/v1/cms_menu/delete/<int:pk>', views.deleteCMSMenu),
]