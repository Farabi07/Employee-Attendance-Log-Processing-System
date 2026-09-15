
from django.urls import path

from chat.views import message_views as views


urlpatterns = [
	path('api/v1/message/channel/<int:channel_id>/', views.getChannelMessages),

	path('api/v1/message/channel/<int:channel_id>/send/', views.sendChannelMessage),

	path('api/v1/message/conversation/<int:conversation_id>/', views.getConversationMessages),

	path('api/v1/message/conversation/<int:conversation_id>/send/', views.sendConversationMessage),

	path('api/v1/message/<int:pk>/edit/', views.editMessage),

	path('api/v1/message/<int:pk>/delete/', views.deleteMessage),

	path('api/v1/message/<int:pk>/react/', views.reactToMessage),
]
