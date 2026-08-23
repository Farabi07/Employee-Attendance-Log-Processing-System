
from django.urls import path

from attendance.views import shift_views as views


urlpatterns = [
	path('api/v1/shift/all/', views.getAllShift),

	path('api/v1/shift/without_pagination/all/', views.getAllShiftWithoutPagination),

	path('api/v1/shift/<int:pk>', views.getAShift),

	path('api/v1/shift/create/', views.createShift),

	path('api/v1/shift/update/<int:pk>', views.updateShift),

	path('api/v1/shift/delete/<int:pk>', views.deleteShift),
]
