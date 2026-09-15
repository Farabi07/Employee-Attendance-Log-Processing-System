from rest_framework import status
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response

from drf_spectacular.utils import extend_schema, OpenApiParameter

from commons.pagination import Pagination

from django.utils import timezone

from chat.models import Message, MessageReaction
from chat.serializers import MessageSerializer
from chat.realtime import broadcast_to_group
from chat.notify import notify_channel_message, notify_conversation_message
from chat.views._access import require_channel_membership, require_conversation_participant, require_message_access


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


def _message_list_response(request, pagination, page, total_elements):
	serializer = MessageSerializer(page, many=True, context={'request': request})
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
	return _message_list_response(request, pagination, page, messages.count())




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

	payload = MessageSerializer(message, context={'request': request}).data
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
	return _message_list_response(request, pagination, page, messages.count())




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

	payload = MessageSerializer(message, context={'request': request}).data
	broadcast_to_group(f'chat_dm_{conversation.id}', 'message.new', {'scope': 'dm', 'conversation_id': conversation.id, 'message': payload})
	notify_conversation_message(message)

	return Response(payload, status=status.HTTP_201_CREATED)




def _message_group(message):
	"""Same group-naming convention message.new already broadcasts to —
	channel or DM, whichever this message belongs to."""
	return f'chat_channel_{message.channel_id}' if message.channel_id else f'chat_dm_{message.conversation_id}'


@extend_schema(request=MessageSerializer, responses=MessageSerializer)
@api_view(['POST'])
@permission_classes([IsAuthenticated])
def editMessage(request, pk):
	message, error = require_message_access(request, pk)
	if error:
		return error

	if message.sender_id != request.user.id:
		return Response({'detail': 'You can only edit your own messages.'}, status=status.HTTP_403_FORBIDDEN)
	if message.is_deleted:
		return Response({'detail': 'Cannot edit a deleted message.'}, status=status.HTTP_400_BAD_REQUEST)

	body = (request.data.get('body') or '').strip()
	if not body:
		return Response({'detail': 'body is required'}, status=status.HTTP_400_BAD_REQUEST)

	message.body = body
	message.edited_at = timezone.now()
	message.save(update_fields=['body', 'edited_at', 'updated_at'])

	payload = MessageSerializer(message, context={'request': request}).data
	broadcast_to_group(_message_group(message), 'message.edited', {'message': payload})

	return Response(payload, status=status.HTTP_200_OK)




@extend_schema(request=None, responses=MessageSerializer)
@api_view(['POST'])
@permission_classes([IsAuthenticated])
def deleteMessage(request, pk):
	message, error = require_message_access(request, pk)
	if error:
		return error

	if message.sender_id != request.user.id:
		return Response({'detail': 'You can only delete your own messages.'}, status=status.HTTP_403_FORBIDDEN)

	if not message.is_deleted:
		message.is_deleted = True
		message.body = None
		message.attachment.delete(save=False)
		message.save(update_fields=['is_deleted', 'body', 'attachment', 'updated_at'])

	payload = MessageSerializer(message, context={'request': request}).data
	broadcast_to_group(_message_group(message), 'message.deleted', {'message': payload})

	return Response(payload, status=status.HTTP_200_OK)




@extend_schema(request=None, responses=MessageSerializer)
@api_view(['POST'])
@permission_classes([IsAuthenticated])
def reactToMessage(request, pk):
	message, error = require_message_access(request, pk)
	if error:
		return error
	if message.is_deleted:
		return Response({'detail': 'Cannot react to a deleted message.'}, status=status.HTTP_400_BAD_REQUEST)

	emoji = (request.data.get('emoji') or '').strip()
	if not emoji:
		return Response({'detail': 'emoji is required'}, status=status.HTTP_400_BAD_REQUEST)

	reaction, created = MessageReaction.objects.get_or_create(message=message, user=request.user, emoji=emoji)
	if not created:
		reaction.delete()

	payload = MessageSerializer(message, context={'request': request}).data
	# reacted_by_me in payload['reactions'] is computed from THIS requester's
	# viewpoint — baking it into a group broadcast would make every other
	# recipient's client see the reactor's own reacted_by_me state instead of
	# their own. Broadcast counts only, plus who/what/removed, so each client
	# updates its own reacted_by_me locally (true for themselves only when
	# user_id matches their own id) while still syncing counts exactly.
	counts_only = [{'emoji': r['emoji'], 'count': r['count']} for r in payload['reactions']]
	broadcast_to_group(_message_group(message), 'message.reaction', {
		'message_id': message.id,
		'emoji': emoji,
		'user_id': request.user.id,
		'removed': not created,
		'reactions': counts_only,
	})

	return Response(payload, status=status.HTTP_200_OK)
