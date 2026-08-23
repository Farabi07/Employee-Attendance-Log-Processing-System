
from django.urls import path

from support.views import ticket_detail_views as views


urlpatterns = [
	path('api/v1/ticket_detail/all/', views.getAllTicketDetail),

	path('api/v1/ticket_detail/get_all_by_ticket_id/<int:ticket_id>', views.getAllTicketDetailByTicketId),

	path('api/v1/ticket_detail/<int:pk>', views.getATicketDetail),

	path('api/v1/ticket_detail/create/', views.createTicketDetail),

	path('api/v1/ticket_detail/update/<int:pk>', views.updateTicketDetail),
	
	path('api/v1/ticket_detail/delete/<int:pk>', views.deleteTicketDetail),
]