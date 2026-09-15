from django.core.exceptions import ObjectDoesNotExist

from rest_framework import status
from rest_framework.response import Response

from chat.models import Channel, ChannelMembership, Conversation, ConversationParticipant


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
	(channel, None) on success or (None, error_response) on failure."""
	try:
		channel = Channel.objects.get(pk=pk, organization=request.user.organization)
	except ObjectDoesNotExist:
		return None, Response({'detail': f"Channel id - {pk} doesn't exist"}, status=status.HTTP_404_NOT_FOUND)

	if not ChannelMembership.objects.filter(channel=channel, user=request.user).exists():
		return None, Response({'detail': 'Not a member of this channel.'}, status=status.HTTP_403_FORBIDDEN)

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
