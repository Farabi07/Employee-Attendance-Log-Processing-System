from django.urls import path

from attendance.views import availability_views as views


urlpatterns = [
	path('api/v1/mine/', views.getMyAvailability),
	path('api/v1/mine/update/', views.setMyAvailability),
	path('api/v1/employee/<int:employee_id>/', views.getEmployeeAvailability),
	path('api/v1/all/', views.getAllAvailability),
]
