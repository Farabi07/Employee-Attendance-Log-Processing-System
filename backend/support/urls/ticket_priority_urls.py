
from django.urls import path

from support.views import ticket_priority_views as views


urlpatterns = [
	path('api/v1/ticket_priority/all/', views.getAllTicketPriority),

	path('api/v1/ticket_priority/<int:pk>', views.getATicketPriority),

	path('api/v1/ticket_priority/create/', views.createTicketPriority),

	path('api/v1/ticket_priority/update/<int:pk>', views.updateTicketPriority),
	
	path('api/v1/ticket_priority/delete/<int:pk>', views.deleteTicketPriority),
]