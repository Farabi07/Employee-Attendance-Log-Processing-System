
from django.urls import path

from support.views import ticket_department_views as views


urlpatterns = [
	path('api/v1/ticket_department/all/', views.getAllTicketDepartment),

	path('api/v1/ticket_department/<int:pk>', views.getATicketDepartment),

	path('api/v1/ticket_department/create/', views.createTicketDepartment),

	path('api/v1/ticket_department/update/<int:pk>', views.updateTicketDepartment),
	
	path('api/v1/ticket_department/delete/<int:pk>', views.deleteTicketDepartment),
]