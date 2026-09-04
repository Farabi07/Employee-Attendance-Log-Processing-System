from django.urls import path

from attendance.views import shift_swap_views as views


urlpatterns = [
	path('api/v1/request/', views.createShiftSwapRequest),
	path('api/v1/mine/', views.listMyShiftSwapRequests),
	path('api/v1/<int:pk>/respond/', views.respondToShiftSwapRequest),
	path('api/v1/<int:pk>/cancel/', views.cancelShiftSwapRequest),
	path('api/v1/all/', views.listOrgShiftSwapRequests),
	path('api/v1/<int:pk>/review/', views.reviewShiftSwapRequest),
]
