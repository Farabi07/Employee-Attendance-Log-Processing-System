
from django.urls import path

from attendance.views import attendance_views as views


urlpatterns = [
	path('api/v1/attendance/all/', views.getAllAttendance),

	path('api/v1/attendance/without_pagination/all/', views.getAllAttendanceWithoutPagination),

	path('api/v1/attendance/search/', views.searchAttendance),

	path('api/v1/attendance/get_all_by_employee_id/<int:employee_id>', views.getAllAttendanceByEmployeeId),

	path('api/v1/attendance/today/', views.getMyTodayAttendance),

	path('api/v1/attendance/checkin/', views.checkIn),

	path('api/v1/attendance/checkout/', views.checkOut),

	path('api/v1/attendance/qr_token/<int:branch_id>/image/', views.getBranchQRImage),

	path('api/v1/attendance/qr_token/<int:branch_id>/live/', views.getBranchLiveCode),

	path('api/v1/attendance/qr_token/<int:branch_id>/regenerate/', views.regenerateBranchQRToken),

	path('api/v1/attendance/qr_token/<int:branch_id>/geofence/', views.updateBranchGeofence),

	path('api/v1/attendance/export/pdf/', views.exportAttendancePdf),

	path('api/v1/attendance/export/excel/', views.exportAttendanceExcel),

	path('api/v1/attendance/mark_absent/', views.runMarkAbsent),

	path('api/v1/attendance/<int:pk>', views.getAAttendance),

	path('api/v1/attendance/update/<int:pk>', views.updateAttendance),

	path('api/v1/attendance/delete/<int:pk>', views.deleteAttendance),
]
