
from django.urls import path

from attendance.views import notification_views as views


urlpatterns = [
	path('api/v1/notification/mine/', views.getMyNotifications),

	path('api/v1/notification/mark_read/<int:pk>', views.markNotificationRead),

	path('api/v1/notification/mark_all_read/', views.markAllNotificationsRead),

	path('api/v1/notice/mine/', views.getMyNotices),

	path('api/v1/notice/mark_all_read/', views.markAllNoticesRead),

	path('api/v1/notice/create/', views.createNotice),
]
