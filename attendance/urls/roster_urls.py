
from django.urls import path

from attendance.views import roster_views as views


urlpatterns = [
	path('api/v1/roster/all/', views.getAllRoster),

	path('api/v1/roster/without_pagination/all/', views.getAllRosterWithoutPagination),

	path('api/v1/roster/get_all_by_employee_id/<int:employee_id>', views.getAllRosterByEmployeeId),

	path('api/v1/roster/<int:pk>', views.getARoster),

	path('api/v1/roster/create/', views.createRoster),

	path('api/v1/roster/update/<int:pk>', views.updateRoster),

	path('api/v1/roster/delete/<int:pk>', views.deleteRoster),
]
