
from django.urls import path

from site_settings.views import general_setting_views as views


urlpatterns = [
	path('api/v1/general_setting/all/', views.getAllGeneralSetting),

	path('api/v1/general_setting/<int:pk>', views.getAGeneralSetting),

	path('api/v1/general_setting/create/', views.createGeneralSetting),

	path('api/v1/general_setting/update/<int:pk>', views.updateGeneralSetting),
	
	path('api/v1/general_setting/delete/<int:pk>', views.deleteGeneralSetting),
]