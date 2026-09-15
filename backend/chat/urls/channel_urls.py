
from django.urls import path

from chat.views import channel_views as views


urlpatterns = [
	path('api/v1/channel/create/', views.createChannel),

	path('api/v1/channel/mine/', views.getMyChannels),

	path('api/v1/channel/<int:pk>/', views.getChannel),

	path('api/v1/channel/<int:pk>/members/add/', views.addChannelMembers),

	path('api/v1/channel/<int:pk>/members/remove/', views.removeChannelMember),

	path('api/v1/channel/<int:pk>/mark_read/', views.markChannelRead),
]
