from django.core.exceptions import ObjectDoesNotExist
from django.db import transaction
from django.utils import timezone

from rest_framework import status
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response

from drf_spectacular.utils import extend_schema, OpenApiParameter

from authentication.models import Employee

from commons.pagination import Pagination

from chat.models import Conversation, ConversationParticipant
from chat.serializers import ConversationSerializer
from chat.views._access import require_conversation_participant


@extend_schema(request=None, responses=ConversationSerializer)
@api_view(['POST'])
@permission_classes([IsAuthenticated])
def startConversation(request):
	"""Any org member can start a DM with any other org member — unlike
	channels, this is deliberately not manager-gated. Reuses an existing
	conversation between the same two people instead of creating a
	duplicate every time "message" is tapped on the same colleague."""
	other_user_id = request.data.get('user_id')
	try:
		other_user = Employee.objects.get(pk=other_user_id, organization=request.user.organization)
	except ObjectDoesNotExist:
		return Response({'detail': f"User id - {other_user_id} doesn't exist"}, status=status.HTTP_400_BAD_REQUEST)

	if other_user.id == request.user.id:
		return Response({'detail': 'Cannot start a conversation with yourself.'}, status=status.HTTP_400_BAD_REQUEST)

	with transaction.atomic():
		existing = (
			Conversation.objects.filter(organization=request.user.organization, participants__user=request.user)
			.filter(participants__user=other_user)
			.first()
		)
		if existing:
			return Response(ConversationSerializer(existing, context={'request': request}).data, status=status.HTTP_200_OK)

		conversation = Conversation.objects.create(organization=request.user.organization)
		ConversationParticipant.objects.bulk_create([
			ConversationParticipant(conversation=conversation, user=request.user),
			ConversationParticipant(conversation=conversation, user=other_user),
		])

	return Response(ConversationSerializer(conversation, context={'request': request}).data, status=status.HTTP_201_CREATED)




@extend_schema(parameters=[OpenApiParameter("page"), OpenApiParameter("size")], request=None, responses=ConversationSerializer)
@api_view(['GET'])
@permission_classes([IsAuthenticated])
def getMyConversations(request):
	conversations = Conversation.objects.filter(organization=request.user.organization, participants__user=request.user)

	total_elements = conversations.count()

	pagination = Pagination()
	pagination.page = request.query_params.get('page')
	pagination.size = request.query_params.get('size')
	page = pagination.paginate_data(conversations)

	memberships = {
		p.conversation_id: p.last_read_at
		for p in ConversationParticipant.objects.filter(conversation__in=page.object_list, user=request.user)
	}
	for conversation in page.object_list:
		last_read_at = memberships.get(conversation.id)
		unread = conversation.messages.exclude(sender=request.user).exclude(is_deleted=True)
		if last_read_at:
			unread = unread.filter(created_at__gt=last_read_at)
		conversation._unread_count = unread.count()

	serializer = ConversationSerializer(page, many=True, context={'request': request})

	return Response({
		'conversations': serializer.data,
		'page': pagination.page,
		'size': pagination.size,
		'total_pages': pagination.total_pages,
		'total_elements': total_elements,
	}, status=status.HTTP_200_OK)




@extend_schema(request=None, responses=None)
@api_view(['POST'])
@permission_classes([IsAuthenticated])
def markConversationRead(request, pk):
	conversation, error = require_conversation_participant(request, pk)
	if error:
		return error

	ConversationParticipant.objects.filter(conversation=conversation, user=request.user).update(last_read_at=timezone.now())
	return Response({'detail': 'Conversation marked read'}, status=status.HTTP_200_OK)
