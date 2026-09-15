from rest_framework import status
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response

from drf_spectacular.utils import extend_schema, OpenApiParameter

from commons.pagination import Pagination

from chat.models import Message
from chat.serializers import MessageSerializer
from chat.realtime import broadcast_to_group
from chat.notify import notify_channel_message, notify_conversation_message
from chat.views._access import require_channel_membership, require_conversation_participant


def _paginate_messages(request, messages):
	"""commons.pagination.Pagination always orders by id ascending (oldest
	first) — fine for a notification feed, but a thread should open on its
	newest messages. With no explicit ?page=, default to the last page so
	the first load shows the latest messages; older ones are fetched by
	walking pages backward from there."""
	pagination = Pagination()
	pagination.size = request.query_params.get('size')

	page_param = request.query_params.get('page')
	if page_param is None:
		total = messages.count()
		pagination.page = str(-(-total // pagination.size) or 1)
	else:
		pagination.page = page_param

	return pagination, pagination.paginate_data(messages)


def _message_list_response(pagination, page, total_elements):
	serializer = MessageSerializer(page, many=True)
	return Response({
		'messages': serializer.data,
		'page': pagination.page,
		'size': pagination.size,
		'total_pages': pagination.total_pages,
		'total_elements': total_elements,
	}, status=status.HTTP_200_OK)




@extend_schema(parameters=[OpenApiParameter("page"), OpenApiParameter("size")], request=None, responses=MessageSerializer)
@api_view(['GET'])
@permission_classes([IsAuthenticated])
def getChannelMessages(request, channel_id):
	channel, error = require_channel_membership(request, channel_id)
	if error:
		return error

	messages = Message.objects.filter(channel=channel)
	pagination, page = _paginate_messages(request, messages)
	return _message_list_response(pagination, page, messages.count())




@extend_schema(request=MessageSerializer, responses=MessageSerializer)
@api_view(['POST'])
@permission_classes([IsAuthenticated])
def sendChannelMessage(request, channel_id):
	channel, error = require_channel_membership(request, channel_id)
	if error:
		return error

	body = (request.data.get('body') or '').strip()
	attachment = request.FILES.get('attachment')
	if not body and not attachment:
		return Response({'detail': 'body or attachment is required'}, status=status.HTTP_400_BAD_REQUEST)

	message = Message.objects.create(channel=channel, sender=request.user, body=body or None, attachment=attachment)

	payload = MessageSerializer(message).data
	broadcast_to_group(f'chat_channel_{channel.id}', 'message.new', {'scope': 'channel', 'channel_id': channel.id, 'message': payload})
	notify_channel_message(message)

	return Response(payload, status=status.HTTP_201_CREATED)




@extend_schema(parameters=[OpenApiParameter("page"), OpenApiParameter("size")], request=None, responses=MessageSerializer)
@api_view(['GET'])
@permission_classes([IsAuthenticated])
def getConversationMessages(request, conversation_id):
	conversation, error = require_conversation_participant(request, conversation_id)
	if error:
		return error

	messages = Message.objects.filter(conversation=conversation)
	pagination, page = _paginate_messages(request, messages)
	return _message_list_response(pagination, page, messages.count())




@extend_schema(request=MessageSerializer, responses=MessageSerializer)
@api_view(['POST'])
@permission_classes([IsAuthenticated])
def sendConversationMessage(request, conversation_id):
	conversation, error = require_conversation_participant(request, conversation_id)
	if error:
		return error

	body = (request.data.get('body') or '').strip()
	attachment = request.FILES.get('attachment')
	if not body and not attachment:
		return Response({'detail': 'body or attachment is required'}, status=status.HTTP_400_BAD_REQUEST)

	message = Message.objects.create(conversation=conversation, sender=request.user, body=body or None, attachment=attachment)

	payload = MessageSerializer(message).data
	broadcast_to_group(f'chat_dm_{conversation.id}', 'message.new', {'scope': 'dm', 'conversation_id': conversation.id, 'message': payload})
	notify_conversation_message(message)

	return Response(payload, status=status.HTTP_201_CREATED)
