
from django.urls import path

from support.views import message_views as views


urlpatterns = [
	path('api/v1/message/all/', views.getAllMessage),

	path('api/v1/message/get_all_senders_with_unseen_message_count_by_receiver_id/<int:receiver_id>', views.getAllSendersWithUnseenMessageCount),

	path('api/v1/message/get_all_by_sender_id/<int:sender_id>', views.getAllMessageBySenderId),

	path('api/v1/message/<int:pk>', views.getAMessage),

	path('api/v1/message/create/', views.createMessage),

	# path('api/v1/message/update/<int:pk>', views.updateMessage),
	
	path('api/v1/message/delete/<int:pk>', views.deleteMessage),
]