
from django.urls import path

from chat.views import conversation_views as views


urlpatterns = [
	path('api/v1/conversation/start/', views.startConversation),

	path('api/v1/conversation/mine/', views.getMyConversations),

	path('api/v1/conversation/<int:pk>/mark_read/', views.markConversationRead),
]
