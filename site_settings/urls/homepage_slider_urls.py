
from django.urls import path

from site_settings.views import homepage_slider_views as views


urlpatterns = [
	path('api/v1/homepage_slider/all/', views.getAllHomePageSlider),

	path('api/v1/homepage_slider/<int:pk>', views.getAHomePageSlider),

	path('api/v1/homepage_slider/create/', views.createHomePageSlider),

	path('api/v1/homepage_slider/update/<int:pk>', views.updateHomePageSlider),
	
	path('api/v1/homepage_slider/delete/<int:pk>', views.deleteHomePageSlider),
]