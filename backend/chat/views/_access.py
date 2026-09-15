from django.core.exceptions import ObjectDoesNotExist
from django.db.models import Q

from rest_framework import status
from rest_framework.response import Response

from chat.models import Channel, ChannelMembership, Conversation, ConversationParticipant, Message
from chat.realtime import broadcast_to_group


def get_list_param(data, key):
	"""request.data.get(key) only returns request data's LAST value for a
	repeated form/multipart field (request.data is a QueryDict there,
	same as request.POST) — channel creation needs every member_id, not
	just one, and this app's DEFAULT_PARSER_CLASSES include both
	MultiPartParser and JSONParser, so callers may send either a
	multipart form (repeated member_ids fields) or a JSON body (a real
	list). Handles both."""
	if hasattr(data, 'getlist'):
		return data.getlist(key)
	return data.get(key) or []


def require_channel_membership(request, pk):
	"""Every channel/message view needs this same check — org-scoped fetch
	plus a membership check, since this codebase has no object-level DRF
	permission classes and does access control inline in each view. Returns
	(channel, None) on success or (None, error_response) on failure.

	For a public channel, a user with no ChannelMembership row yet is
	lazily joined here (their first real interaction with it) rather than
	being pre-populated at creation time — keeps unread tracking and "who's
	actually here" working the exact same way selective channels already
	do, without needing to bulk-create a row per org member up front or
	backfill new hires later."""
	try:
		channel = Channel.objects.get(pk=pk, organization=request.user.organization)
	except ObjectDoesNotExist:
		return None, Response({'detail': f"Channel id - {pk} doesn't exist"}, status=status.HTTP_404_NOT_FOUND)

	if not ChannelMembership.objects.filter(channel=channel, user=request.user).exists():
		if not channel.is_public:
			return None, Response({'detail': 'Not a member of this channel.'}, status=status.HTTP_403_FORBIDDEN)

		ChannelMembership.objects.create(channel=channel, user=request.user)
		# The user's own WebSocket connection (if already open) only knows
		# the channel groups it joined at connect time — nudge it to join
		# this one live, same mechanism addChannelMembers uses for an
		# explicit invite. Imported lazily to avoid a serializers<->views
		# import cycle at module load time.
		from chat.serializers import ChannelDetailSerializer

		broadcast_to_group(f'chat_user_{request.user.id}', 'channel.created', {'channel': ChannelDetailSerializer(channel, context={'request': request}).data})

	return channel, None


def require_channel_admin(request, pk):
	"""Adding/removing members requires either a channel-admin membership
	row or org-level manager/moderator standing — deliberately NOT routed
	through require_channel_membership, since a manager/moderator should be
	able to manage a channel's roster even if they were never added to it
	themselves."""
	try:
		channel = Channel.objects.get(pk=pk, organization=request.user.organization)
	except ObjectDoesNotExist:
		return None, Response({'detail': f"Channel id - {pk} doesn't exist"}, status=status.HTTP_404_NOT_FOUND)

	is_channel_admin = ChannelMembership.objects.filter(channel=channel, user=request.user, is_admin=True).exists()
	if not (is_channel_admin or request.user.is_manager_or_moderator()):
		return None, Response({'detail': 'You do not have permission to manage this channel.'}, status=status.HTTP_403_FORBIDDEN)

	return channel, None


def require_conversation_participant(request, pk):
	try:
		conversation = Conversation.objects.get(pk=pk, organization=request.user.organization)
	except ObjectDoesNotExist:
		return None, Response({'detail': f"Conversation id - {pk} doesn't exist"}, status=status.HTTP_404_NOT_FOUND)

	if not ConversationParticipant.objects.filter(conversation=conversation, user=request.user).exists():
		return None, Response({'detail': 'Not a participant in this conversation.'}, status=status.HTTP_403_FORBIDDEN)

	return conversation, None


def require_message_access(request, pk):
	"""Edit/delete/react all need this same check first — a message can
	only be touched by someone who can already see its parent thread, so
	this just fetches the Message and delegates to whichever of the two
	membership checks above applies. Returns (message, None) or
	(None, error_response)."""
	org = request.user.organization
	try:
		message = Message.objects.select_related('channel', 'conversation').get(
			Q(channel__organization=org) | Q(conversation__organization=org), pk=pk,
		)
	except ObjectDoesNotExist:
		return None, Response({'detail': f"Message id - {pk} doesn't exist"}, status=status.HTTP_404_NOT_FOUND)

	if message.channel_id:
		_, error = require_channel_membership(request, message.channel_id)
	else:
		_, error = require_conversation_participant(request, message.conversation_id)
	if error:
		return None, error

	return message, None
