from django.core.exceptions import ObjectDoesNotExist
from authentication.serializers import AdminUserMinimalListSerializer
from authentication.views.user_views import User

from rest_framework import status
from rest_framework.decorators import api_view, permission_classes, parser_classes
from rest_framework.parsers import JSONParser, MultiPartParser, FormParser
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response

from drf_spectacular.utils import  extend_schema, OpenApiParameter

from authentication.decorators import has_permissions

from support.models import Message
from support.serializers import MessageSerializer, MessageListSerializer

from utils.login_logout import get_all_logged_in_users

from commons.pagination import Pagination
from commons.enums import PermissionEnum

import datetime




# Create your views here.

@extend_schema(
	parameters=[
		OpenApiParameter("page"),
		OpenApiParameter("size"),
  ],
	request=MessageSerializer,
	responses=MessageListSerializer
)
@api_view(['GET'])
# @permission_classes([IsAuthenticated])
# @has_permissions([PermissionEnum.ATTRIBUTE_LIST.name])
def getAllMessage(request):
	messages = Message.objects.all()
	total_elements = messages.count()

	page = request.query_params.get('page')
	size = request.query_params.get('size')

	# Pagination
	pagination = Pagination()
	pagination.page = page
	pagination.size = size
	messages = pagination.paginate_data(messages)

	serializer = MessageListSerializer(messages, many=True)

	response = {
		'messages': serializer.data,
		'page': pagination.page,
		'size': pagination.size,
		'total_pages': pagination.total_pages,
		'total_elements': total_elements,
	}

	return Response(response, status=status.HTTP_200_OK)




@extend_schema(
	parameters=[
		OpenApiParameter("page"),
		OpenApiParameter("size"),
  ],
	request=MessageSerializer,
	responses=MessageListSerializer
)
@api_view(['GET'])
@permission_classes([IsAuthenticated])
# @has_permissions([PermissionEnum.ATTRIBUTE_LIST.name])
def getAllSendersWithUnseenMessageCount(request, receiver_id):
	response_list = list()

	# messages = Message.objects.filter(seen=False, receiver__id=receiver_id)
	# print('messages: ', messages)
	# sender_ids = messages.order_by().distinct('sender').values_list('sender__id', flat=True)
	# print('sender_ids: ', sender_ids)

	users = User.objects.exclude(pk=receiver_id)

	logged_in_user_ids = get_all_logged_in_users()
	print('logged_in_user_ids: ', logged_in_user_ids)

	for user in users:
		sender_id = str(user.id)
		serializer = AdminUserMinimalListSerializer(user)
		sdata = serializer.data
		unseen_count = Message.objects.filter(sender__id=sender_id, receiver__id=receiver_id, seen=False).count()
		sdata['unseen_count'] = unseen_count
		if sender_id in logged_in_user_ids:
			print('sender_id: ', sender_id)
			sdata['is_online'] = True
			logged_in_user_ids.remove(sender_id)
			print('logged_in_user_ids: ', logged_in_user_ids)
		else:
			sdata['is_online'] = False
		response_list.append(sdata)

	return Response({'users': response_list}, status=status.HTTP_200_OK)




@extend_schema(
	parameters=[
		OpenApiParameter("page"),
		OpenApiParameter("size"),
  ],
	request=MessageSerializer,
	responses=MessageListSerializer
)
@api_view(['GET'])
@permission_classes([IsAuthenticated])
# @has_permissions([PermissionEnum.ATTRIBUTE_LIST.name])
def getAllMessageBySenderId(request, sender_id):
	receiver_id = request.user.id
	messages = Message.objects.filter(sender__id=sender_id, receiver__id=receiver_id)

	unseen_messages = Message.objects.filter(sender__id=sender_id, receiver__id=receiver_id, seen=False)
	for unseen_message in unseen_messages:
		unseen_message.seen = True
		unseen_message.save()

	serializer = MessageListSerializer(messages, many=True)

	response = {
		'messages': serializer.data,
	}

	return Response(response, status=status.HTTP_200_OK)




@extend_schema(request=MessageSerializer, responses=MessageSerializer)
@api_view(['GET'])
# @permission_classes([IsAuthenticated])
# @has_permissions([PermissionEnum.ATTRIBUTE_DETAILS.name])
def getAMessage(request, pk):
	try:
		message = Message.objects.get(pk=pk)
		serializer = MessageSerializer(message)
		return Response(serializer.data, status=status.HTTP_200_OK)
	except ObjectDoesNotExist:
		return Response({'detail': f"Message id - {pk} does't exists"}, status=status.HTTP_400_BAD_REQUEST)




@extend_schema(request=MessageSerializer, responses=MessageSerializer)
@api_view(['POST'])
@permission_classes([IsAuthenticated])
# @has_permissions([PermissionEnum.ATTRIBUTE_CREATE.name])
def createMessage(request):
	data = request.data
	sender_id = request.user.id
	print('data: ', data)
	print('content_type: ', request.content_type)
	
	filtered_data = {}

	for key, value in data.items():
		if value != '' and value != 0 and value != '0':
			filtered_data[key] = value

	filtered_data['sender'] = sender_id

	print('filtered_data: ', filtered_data)

	serializer = MessageSerializer(data=filtered_data)

	if serializer.is_valid():
		serializer.save()
		return Response(serializer.data)
	else:
		return Response(serializer.errors)




@extend_schema(request=MessageSerializer, responses=MessageSerializer)
@api_view(['PUT'])
@permission_classes([IsAuthenticated])
@has_permissions([PermissionEnum.ATTRIBUTE_UPDATE.name])
# @parser_classes([MultiPartParser, FormParser])
def updateMessage(request, pk):
	data = request.data
	print('data :', data)
	filtered_data = {}

	try:
		message_obj = Message.objects.get(pk=pk)
	except ObjectDoesNotExist:
		return Response({'detail': f"Product id - {pk} doesn't exists"})

	for key, value in data.items():
		if value != '' and value != '0':
			filtered_data[key] = value

	print('filtered_data: ', filtered_data)
		
	logo = filtered_data.get('logo', None)
	favicon = filtered_data.get('favicon', None)

	if logo is not None and type(logo) == str:
		popped_logo = filtered_data.pop('logo')
	if favicon is not None and type(favicon) == str:
		popped_favicon = filtered_data.pop('favicon')

	serializer = MessageSerializer(message_obj, data=filtered_data)
	if serializer.is_valid():
		serializer.save()
		return Response(serializer.data, status=status.HTTP_200_OK)
	else:
		return Response(serializer.errors)




@extend_schema(request=MessageSerializer, responses=MessageSerializer)
@api_view(['DELETE'])
@permission_classes([IsAuthenticated])
@has_permissions([PermissionEnum.ATTRIBUTE_DELETE.name])
def deleteMessage(request, pk):
	try:
		message = Message.objects.get(pk=pk)
		message.delete()
		return Response({'detail': f'Message id - {pk} is deleted successfully'}, status=status.HTTP_200_OK)
	except ObjectDoesNotExist:
		return Response({'detail': f"Message id - {pk} does't exists"}, status=status.HTTP_400_BAD_REQUEST)


