
from django.urls import path

from cms.views import itinerary_views as views


urlpatterns = [

	path('api/v1/Itinerary/all/', views.getAllItinerary),

	path('api/v1/Itinerary/without_pagination/all/', views.getAllItineraryWithoutPagination),

	path('api/v1/get_all_Itinerary_by_cms_menu_id/<str:menu_id>', views.getAllItineraryByCMSMenuId),

	path('api/v1/Itinerary/<int:pk>', views.getItinerary),

	path('api/v1/cms_menu_content/create/', views.createItinerary),

	path('api/v1/Itinerary/update/<int:pk>', views.updateItinerary),
	
	path('api/v1/Itinerary/delete/<int:pk>', views.deleteItinerary),

	path('api/v1/Itinerary/get_Itinerary_by_cms_content_id/<int:pk>', views.getItineraryByCMSContent),

]