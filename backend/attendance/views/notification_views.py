from django.core.exceptions import ObjectDoesNotExist

from rest_framework import status
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response

from drf_spectacular.utils import extend_schema, OpenApiParameter

from attendance.models import Notification
from attendance.serializers import NotificationSerializer

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
	notifications = Notification.objects.filter(recipient=request.user)

	if request.query_params.get('unread_only') in ('true', 'True', '1'):
		notifications = notifications.filter(is_read=False)

	unread_count = Notification.objects.filter(recipient=request.user, is_read=False).count()
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
	updated = Notification.objects.filter(recipient=request.user, is_read=False).update(is_read=True)
	return Response({'detail': f'{updated} notification(s) marked read'}, status=status.HTTP_200_OK)
