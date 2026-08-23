
from django.urls import path

from attendance.views import leave_type_views as views


urlpatterns = [
	path('api/v1/leave_type/all/', views.getAllLeaveType),

	path('api/v1/leave_type/without_pagination/all/', views.getAllLeaveTypeWithoutPagination),

	path('api/v1/leave_type/<int:pk>', views.getALeaveType),

	path('api/v1/leave_type/create/', views.createLeaveType),

	path('api/v1/leave_type/update/<int:pk>', views.updateLeaveType),

	path('api/v1/leave_type/delete/<int:pk>', views.deleteLeaveType),
]
