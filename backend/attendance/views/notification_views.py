from django.core.exceptions import ObjectDoesNotExist

from rest_framework import status
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response

from drf_spectacular.utils import extend_schema, OpenApiParameter

from attendance.models import Notification
from attendance.serializers import NotificationSerializer
from attendance.notify import notify_notice
from authentication.permissions import IsManagerOrModerator

from commons.pagination import Pagination




# Create your views here.

@extend_schema(
	parameters=[
		OpenApiParameter("page"),
		OpenApiParameter("size"),
		OpenApiParameter("unread_only"),
  ],
	request=NotificationSerializer,
	responses=NotificationSerializer
)
@api_view(['GET'])
@permission_classes([IsAuthenticated])
def getMyNotifications(request):
	# Notices (manager/moderator broadcasts) live in their own "Notice"
	# section on the frontend — excluded here so they don't also show up
	# mixed into the regular Notifications feed. See getMyNotices below.
	notifications = Notification.objects.filter(recipient=request.user).exclude(
		notification_type=Notification.NotificationType.NOTICE
	)

	if request.query_params.get('unread_only') in ('true', 'True', '1'):
		notifications = notifications.filter(is_read=False)

	unread_count = notifications.filter(is_read=False).count()
	total_elements = notifications.count()

	page = request.query_params.get('page')
	size = request.query_params.get('size')

	pagination = Pagination()
	pagination.page = page
	pagination.size = size
	notifications = pagination.paginate_data(notifications)

	serializer = NotificationSerializer(notifications, many=True)

	response = {
		'notifications': serializer.data,
		'unread_count': unread_count,
		'page': pagination.page,
		'size': pagination.size,
		'total_pages': pagination.total_pages,
		'total_elements': total_elements,
	}

	return Response(response, status=status.HTTP_200_OK)




@extend_schema(request=None, responses=NotificationSerializer)
@api_view(['POST'])
@permission_classes([IsAuthenticated])
def markNotificationRead(request, pk):
	try:
		notification = Notification.objects.get(pk=pk, recipient=request.user)
	except ObjectDoesNotExist:
		return Response({'detail': f"Notification id - {pk} doesn't exist"}, status=status.HTTP_400_BAD_REQUEST)

	notification.is_read = True
	notification.save()

	serializer = NotificationSerializer(notification)
	return Response(serializer.data, status=status.HTTP_200_OK)




@extend_schema(request=None, responses=None)
@api_view(['POST'])
@permission_classes([IsAuthenticated])
def markAllNotificationsRead(request):
	updated = Notification.objects.filter(recipient=request.user, is_read=False).exclude(
		notification_type=Notification.NotificationType.NOTICE
	).update(is_read=True)
	return Response({'detail': f'{updated} notification(s) marked read'}, status=status.HTTP_200_OK)




@extend_schema(
	parameters=[
		OpenApiParameter("page"),
		OpenApiParameter("size"),
		OpenApiParameter("unread_only"),
  ],
	request=NotificationSerializer,
	responses=NotificationSerializer
)
@api_view(['GET'])
@permission_classes([IsAuthenticated])
def getMyNotices(request):
	"""Mirror of getMyNotifications, scoped to NOTICE rows only — its own
	list, own unread count, own pagination, so a Notices screen never has
	to filter the regular feed client-side."""
	notices = Notification.objects.filter(recipient=request.user, notification_type=Notification.NotificationType.NOTICE)

	if request.query_params.get('unread_only') in ('true', 'True', '1'):
		notices = notices.filter(is_read=False)

	unread_count = notices.filter(is_read=False).count()
	total_elements = notices.count()

	page = request.query_params.get('page')
	size = request.query_params.get('size')

	pagination = Pagination()
	pagination.page = page
	pagination.size = size
	notices = pagination.paginate_data(notices)

	serializer = NotificationSerializer(notices, many=True)

	response = {
		'notifications': serializer.data,
		'unread_count': unread_count,
		'page': pagination.page,
		'size': pagination.size,
		'total_pages': pagination.total_pages,
		'total_elements': total_elements,
	}

	return Response(response, status=status.HTTP_200_OK)




@extend_schema(request=None, responses=None)
@api_view(['POST'])
@permission_classes([IsAuthenticated])
def markAllNoticesRead(request):
	updated = Notification.objects.filter(
		recipient=request.user, is_read=False, notification_type=Notification.NotificationType.NOTICE
	).update(is_read=True)
	return Response({'detail': f'{updated} notice(s) marked read'}, status=status.HTTP_200_OK)




@extend_schema(request=NotificationSerializer, responses=None)
@api_view(['POST'])
@permission_classes([IsAuthenticated, IsManagerOrModerator])
def createNotice(request):
	"""Broadcasts one notice to every other member of the sender's
	organization — a manager or moderator telling the whole store
	something, distinct from a targeted Notification."""
	if not request.user.organization_id:
		return Response({'detail': 'You must belong to an organization to send a notice.'}, status=status.HTTP_400_BAD_REQUEST)

	title = (request.data.get('title') or '').strip()
	message = (request.data.get('message') or '').strip()
	if not title:
		return Response({'detail': 'title is required'}, status=status.HTTP_400_BAD_REQUEST)

	sent_to = notify_notice(request.user, title, message)
	return Response({'detail': f'Notice sent to {sent_to} people.'}, status=status.HTTP_201_CREATED)
