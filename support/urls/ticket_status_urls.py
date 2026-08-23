
from django.urls import path

from support.views import ticket_status_views as views


urlpatterns = [
	path('api/v1/ticket_status/all/', views.getAllTicketStatus),

	path('api/v1/ticket_status/<int:pk>', views.getATicketStatus),

	path('api/v1/ticket_status/create/', views.createTicketStatus),

	path('api/v1/ticket_status/update/<int:pk>', views.updateTicketStatus),
	
	path('api/v1/ticket_status/delete/<int:pk>', views.deleteTicketStatus),
]