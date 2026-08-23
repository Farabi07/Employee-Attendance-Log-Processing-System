
from django.urls import path

from cms.views import cms_meta_data_views as views


urlpatterns = [

	path('api/v1/cms_meta_data/all/', views.getAllMetaData),

	path('api/v1/cms_meta_data/without_pagination/all/', views.getAllMetaDataWithoutPagination),

	path('api/v1/get_all_cms_meta_data_by_cms_menu_id/<str:menu_id>', views.getAllMetaDataByCMSMenuId),

	path('api/v1/cms_meta_data/<int:pk>', views.getMetaData),

	path('api/v1/cms_meta_data/create/', views.createMetaData),

	path('api/v1/cms_meta_data/update/<int:pk>', views.updateMetaData),
	
	path('api/v1/cms_meta_data/delete/<int:pk>', views.deleteMetaData),

	path('api/v1/cms_meta_data/get_meta_data_by_cms_content_name/<str:slug>', views.getMetaDataByCMSContent),

    path('api/v1/cms_meta_data/search/<str>', views.searchMetaData),

]