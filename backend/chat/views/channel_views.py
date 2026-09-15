from django.core.exceptions import ObjectDoesNotExist
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
	"""A manager/moderator creates an invite-only channel and picks its
	initial members up front — there is no "open to whole org" channel
	type, per the product requirement that only named members can see a
	channel."""
	if not request.user.organization_id:
		return Response({'detail': 'You must belong to an organization to create a channel.'}, status=status.HTTP_400_BAD_REQUEST)

	name = (request.data.get('name') or '').strip()
	if not name:
		return Response({'detail': 'name is required'}, status=status.HTTP_400_BAD_REQUEST)

	member_ids = get_list_param(request.data, 'member_ids')
	members = list(Employee.objects.filter(organization=request.user.organization, pk__in=member_ids).exclude(pk=request.user.id))

	channel = Channel.objects.create(
		organization=request.user.organization,
		name=name,
		description=(request.data.get('description') or '').strip() or None,
		created_by=request.user,
	)

	ChannelMembership.objects.create(channel=channel, user=request.user, is_admin=True, added_by=request.user)
	ChannelMembership.objects.bulk_create([
		ChannelMembership(channel=channel, user=member, added_by=request.user)
		for member in members
	])

	payload = ChannelDetailSerializer(channel).data
	for member in members:
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
	channels = Channel.objects.filter(memberships__user=request.user, organization=request.user.organization)

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
		last_read_at = memberships.get(channel.id)
		unread = channel.messages.exclude(sender=request.user)
		if last_read_at:
			unread = unread.filter(created_at__gt=last_read_at)
		channel._unread_count = unread.count()

	serializer = ChannelSerializer(page, many=True)

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
	return Response(ChannelDetailSerializer(channel).data, status=status.HTTP_200_OK)




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
		payload = {'channel_id': channel.id, 'channel': ChannelDetailSerializer(channel).data}
		broadcast_to_group(f'chat_user_{member.id}', 'channel.created', payload)
	if members:
		member_payload = {'channel_id': channel.id, 'members': ChannelDetailSerializer(channel).data['members']}
		broadcast_to_group(f'chat_channel_{channel.id}', 'channel.member_added', member_payload)

	return Response(ChannelDetailSerializer(channel).data, status=status.HTTP_200_OK)




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

	return Response(ChannelDetailSerializer(channel).data, status=status.HTTP_200_OK)




@extend_schema(request=None, responses=None)
@api_view(['POST'])
@permission_classes([IsAuthenticated])
def markChannelRead(request, pk):
	channel, error = require_channel_membership(request, pk)
	if error:
		return error

	ChannelMembership.objects.filter(channel=channel, user=request.user).update(last_read_at=timezone.now())
	return Response({'detail': 'Channel marked read'}, status=status.HTTP_200_OK)
