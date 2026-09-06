
from django.urls import path

from attendance.views import leave_request_views as views


urlpatterns = [
	path('api/v1/leave_request/all/', views.getAllLeaveRequest),

	path('api/v1/leave_request/without_pagination/all/', views.getAllLeaveRequestWithoutPagination),

	path('api/v1/leave_request/get_all_by_employee_id/<int:employee_id>', views.getAllLeaveRequestByEmployeeId),

	path('api/v1/leave_request/balance/mine/', views.getMyLeaveBalance),

	path('api/v1/leave_request/<int:pk>', views.getALeaveRequest),

	path('api/v1/leave_request/create/', views.createLeaveRequest),

	path('api/v1/leave_request/update/<int:pk>', views.updateLeaveRequest),

	path('api/v1/leave_request/review/<int:pk>', views.reviewLeaveRequest),

	path('api/v1/leave_request/delete/<int:pk>', views.deleteLeaveRequest),
]
