
from django.urls import path

from support.views import ticket_views as views


urlpatterns = [
	path('api/v1/ticket/all/', views.getAllTicket),

	path('api/v1/ticket/get_all_by_user_id/<int:user_id>', views.getAllTicketByUserId),

	path('api/v1/ticket/<int:pk>', views.getATicket),

	path('api/v1/ticket/create/', views.createTicket),

	path('api/v1/ticket/update/<int:pk>', views.updateTicket),
	
	path('api/v1/ticket/delete/<int:pk>', views.deleteTicket),
]