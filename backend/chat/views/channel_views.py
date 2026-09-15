from django.core.exceptions import ObjectDoesNotExist
from django.db.models import Q
from django.utils import timezone

from rest_framework import status
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response

from drf_spectacular.utils import extend_schema, OpenApiParameter

from authentication.models import Employee
from authentication.permissions import IsManagerOrModerator

from commons.pagination import Pagination

from chat.models import Channel, ChannelMembership
from chat.serializers import ChannelSerializer, ChannelDetailSerializer
from chat.realtime import broadcast_to_group
from chat.views._access import require_channel_membership, require_channel_admin, get_list_param


@extend_schema(request=ChannelSerializer, responses=ChannelSerializer)
@api_view(['POST'])
@permission_classes([IsAuthenticated, IsManagerOrModerator])
def createChannel(request):
	"""A manager/moderator creates a channel, either:
	- Public (is_public=true): every current org member gets it — no
	  member_ids needed, everyone already has implicit access (see
	  require_channel_membership's lazy-join and getMyChannels' org-wide
	  union below).
	- Selective (default): invite-only, member_ids picks who can see it."""
	if not request.user.organization_id:
		return Response({'detail': 'You must belong to an organization to create a channel.'}, status=status.HTTP_400_BAD_REQUEST)

	name = (request.data.get('name') or '').strip()
	if not name:
		return Response({'detail': 'name is required'}, status=status.HTTP_400_BAD_REQUEST)

	is_public = str(request.data.get('is_public', '')).lower() in ('true', '1', 'yes')

	channel = Channel.objects.create(
		organization=request.user.organization,
		name=name,
		description=(request.data.get('description') or '').strip() or None,
		is_public=is_public,
		created_by=request.user,
	)

	ChannelMembership.objects.create(channel=channel, user=request.user, is_admin=True, added_by=request.user)

	if is_public:
		notify_members = list(Employee.objects.filter(organization=request.user.organization).exclude(pk=request.user.id))
	else:
		member_ids = get_list_param(request.data, 'member_ids')
		notify_members = list(Employee.objects.filter(organization=request.user.organization, pk__in=member_ids).exclude(pk=request.user.id))
		ChannelMembership.objects.bulk_create([
			ChannelMembership(channel=channel, user=member, added_by=request.user)
			for member in notify_members
		])

	# Computed once, after every membership row for this creation is in
	# place, so both the response and every broadcast see the same
	# (complete) member list — a public channel doesn't add rows for
	# anyone but the creator, but still needs everyone nudged live/on next
	# refresh so the channel shows up immediately.
	payload = ChannelDetailSerializer(channel, context={'request': request}).data
	for member in notify_members:
		broadcast_to_group(f'chat_user_{member.id}', 'channel.created', {'channel': payload})

	return Response(payload, status=status.HTTP_201_CREATED)




@extend_schema(
	parameters=[OpenApiParameter("page"), OpenApiParameter("size")],
	request=ChannelSerializer,
	responses=ChannelSerializer,
)
@api_view(['GET'])
@permission_classes([IsAuthenticated])
def getMyChannels(request):
	# Public channels are visible org-wide even before a user has ever
	# opened one (no ChannelMembership row yet — see
	# require_channel_membership's lazy-join) so they can be discovered,
	# not just ones already explicitly joined.
	channels = Channel.objects.filter(
		Q(memberships__user=request.user) | Q(is_public=True),
		organization=request.user.organization,
	).distinct()

	total_elements = channels.count()

	pagination = Pagination()
	pagination.page = request.query_params.get('page')
	pagination.size = request.query_params.get('size')
	page = pagination.paginate_data(channels)

	memberships = {
		m.channel_id: m.last_read_at
		for m in ChannelMembership.objects.filter(channel__in=page.object_list, user=request.user)
	}
	for channel in page.object_list:
		if channel.id not in memberships:
			# Public, never opened — no membership row yet, so there's
			# nothing to compute unread against.
			channel._unread_count = 0
			continue
		last_read_at = memberships.get(channel.id)
		unread = channel.messages.exclude(sender=request.user).exclude(is_deleted=True)
		if last_read_at:
			unread = unread.filter(created_at__gt=last_read_at)
		channel._unread_count = unread.count()

	serializer = ChannelSerializer(page, many=True, context={'request': request})

	return Response({
		'channels': serializer.data,
		'page': pagination.page,
		'size': pagination.size,
		'total_pages': pagination.total_pages,
		'total_elements': total_elements,
	}, status=status.HTTP_200_OK)




@extend_schema(request=None, responses=ChannelDetailSerializer)
@api_view(['GET'])
@permission_classes([IsAuthenticated])
def getChannel(request, pk):
	channel, error = require_channel_membership(request, pk)
	if error:
		return error
	return Response(ChannelDetailSerializer(channel, context={'request': request}).data, status=status.HTTP_200_OK)




@extend_schema(request=None, responses=ChannelDetailSerializer)
@api_view(['POST'])
@permission_classes([IsAuthenticated])
def addChannelMembers(request, pk):
	channel, error = require_channel_admin(request, pk)
	if error:
		return error

	member_ids = get_list_param(request.data, 'member_ids')
	existing_ids = set(ChannelMembership.objects.filter(channel=channel).values_list('user_id', flat=True))
	members = list(
		Employee.objects.filter(organization=request.user.organization, pk__in=member_ids)
		.exclude(pk__in=existing_ids)
	)

	ChannelMembership.objects.bulk_create([
		ChannelMembership(channel=channel, user=member, added_by=request.user)
		for member in members
	])

	for member in members:
		payload = {'channel_id': channel.id, 'channel': ChannelDetailSerializer(channel, context={'request': request}).data}
		broadcast_to_group(f'chat_user_{member.id}', 'channel.created', payload)
	if members:
		member_payload = {'channel_id': channel.id, 'members': ChannelDetailSerializer(channel, context={'request': request}).data['members']}
		broadcast_to_group(f'chat_channel_{channel.id}', 'channel.member_added', member_payload)

	return Response(ChannelDetailSerializer(channel, context={'request': request}).data, status=status.HTTP_200_OK)




@extend_schema(request=None, responses=ChannelDetailSerializer)
@api_view(['POST'])
@permission_classes([IsAuthenticated])
def removeChannelMember(request, pk):
	channel, error = require_channel_admin(request, pk)
	if error:
		return error

	member_id = request.data.get('member_id')
	ChannelMembership.objects.filter(channel=channel, user_id=member_id).delete()

	broadcast_to_group(f'chat_channel_{channel.id}', 'channel.member_removed', {'channel_id': channel.id, 'member_id': member_id})

	return Response(ChannelDetailSerializer(channel, context={'request': request}).data, status=status.HTTP_200_OK)




@extend_schema(request=None, responses=None)
@api_view(['POST'])
@permission_classes([IsAuthenticated])
def markChannelRead(request, pk):
	channel, error = require_channel_membership(request, pk)
	if error:
		return error

	ChannelMembership.objects.filter(channel=channel, user=request.user).update(last_read_at=timezone.now())
	return Response({'detail': 'Channel marked read'}, status=status.HTTP_200_OK)
