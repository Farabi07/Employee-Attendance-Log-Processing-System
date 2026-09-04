from django.core.exceptions import ObjectDoesNotExist
from django.utils import timezone

from rest_framework import status
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response

from drf_spectacular.utils import extend_schema

from authentication.models import Employee
from authentication.permissions import IsManagerOrModerator, HasActiveSubscription

from attendance.models import Roster, ShiftSwapRequest
from attendance.serializers import ShiftSwapRequestListSerializer
from attendance.notify import notify_swap_requested, notify_swap_claimed, notify_swap_reviewed




@extend_schema(request=None, responses=ShiftSwapRequestListSerializer)
@api_view(['POST'])
@permission_classes([IsAuthenticated, HasActiveSubscription])
def createShiftSwapRequest(request):
	"""An employee giving up one of their own upcoming shifts — either to a
	named colleague (proposed_to) or left open for anyone to claim."""
	data = request.data

	try:
		roster = Roster.objects.get(pk=data.get('roster'), employee_id=request.user.id)
	except (ObjectDoesNotExist, ValueError, TypeError):
		return Response({'detail': "That shift doesn't belong to you"}, status=status.HTTP_400_BAD_REQUEST)

	if roster.date < timezone.localdate():
		return Response({'detail': "Can't request a swap for a shift that's already passed"}, status=status.HTTP_400_BAD_REQUEST)

	if roster.swap_requests.exclude(status__in=[ShiftSwapRequest.Status.REJECTED, ShiftSwapRequest.Status.CANCELLED]).exists():
		return Response({'detail': 'This shift already has an active swap request'}, status=status.HTTP_400_BAD_REQUEST)

	proposed_to = None
	proposed_to_id = data.get('proposed_to')
	if proposed_to_id:
		try:
			proposed_to = Employee.objects.get(pk=proposed_to_id, organization=request.user.organization)
		except (ObjectDoesNotExist, ValueError, TypeError):
			return Response({'detail': 'proposed_to must be a teammate in your store'}, status=status.HTTP_400_BAD_REQUEST)
		if proposed_to.id == request.user.id:
			return Response({'detail': "You can't propose a swap to yourself"}, status=status.HTTP_400_BAD_REQUEST)

	swap = ShiftSwapRequest.objects.create(
		roster=roster,
		requested_by_id=request.user.id,
		proposed_to=proposed_to,
		reason=data.get('reason') or None,
	)
	notify_swap_requested(swap)

	return Response(ShiftSwapRequestListSerializer(swap).data, status=status.HTTP_201_CREATED)




@extend_schema(request=None, responses=ShiftSwapRequestListSerializer)
@api_view(['GET'])
@permission_classes([IsAuthenticated, HasActiveSubscription])
def listMyShiftSwapRequests(request):
	"""Three buckets for the current employee: swaps they asked for
	(outgoing), swaps a colleague specifically asked them to take
	(incoming), and open swaps anyone in the store could claim."""
	outgoing = ShiftSwapRequest.objects.filter(requested_by_id=request.user.id)
	incoming = ShiftSwapRequest.objects.filter(proposed_to_id=request.user.id, status=ShiftSwapRequest.Status.PENDING_PEER)
	open_requests = ShiftSwapRequest.objects.filter(
		roster__employee__organization=request.user.organization,
		proposed_to__isnull=True,
		status=ShiftSwapRequest.Status.PENDING_PEER,
	).exclude(requested_by_id=request.user.id)

	return Response(
		{
			'outgoing': ShiftSwapRequestListSerializer(outgoing, many=True).data,
			'incoming': ShiftSwapRequestListSerializer(incoming, many=True).data,
			'open': ShiftSwapRequestListSerializer(open_requests, many=True).data,
		},
		status=status.HTTP_200_OK,
	)




@extend_schema(request=None, responses=ShiftSwapRequestListSerializer)
@api_view(['POST'])
@permission_classes([IsAuthenticated, HasActiveSubscription])
def respondToShiftSwapRequest(request, pk):
	"""The peer's half: accept (claim the shift) or decline (targeted
	requests only — an open request has no single person to decline it)."""
	action = request.data.get('action')
	if action not in ('accept', 'decline'):
		return Response({'detail': "action must be 'accept' or 'decline'"}, status=status.HTTP_400_BAD_REQUEST)

	try:
		swap = ShiftSwapRequest.objects.get(pk=pk, roster__employee__organization=request.user.organization, status=ShiftSwapRequest.Status.PENDING_PEER)
	except ObjectDoesNotExist:
		return Response({'detail': 'Swap request not found or no longer awaiting a colleague'}, status=status.HTTP_404_NOT_FOUND)

	is_targeted_recipient = swap.proposed_to_id == request.user.id
	is_open_claimant = swap.proposed_to_id is None and swap.requested_by_id != request.user.id
	if not (is_targeted_recipient or is_open_claimant):
		return Response({'detail': "This swap request isn't yours to respond to"}, status=status.HTTP_403_FORBIDDEN)

	if action == 'decline':
		if not is_targeted_recipient:
			return Response({'detail': "Only the person it was proposed to can decline it"}, status=status.HTTP_403_FORBIDDEN)
		swap.status = ShiftSwapRequest.Status.CANCELLED
		swap.manager_note = f"Declined by {request.user.first_name} {request.user.last_name}"
		swap.save(update_fields=['status', 'manager_note', 'updated_at'])
		return Response(ShiftSwapRequestListSerializer(swap).data, status=status.HTTP_200_OK)

	swap.claimed_by_id = request.user.id
	swap.status = ShiftSwapRequest.Status.PENDING_MANAGER
	swap.save(update_fields=['claimed_by', 'status', 'updated_at'])
	notify_swap_claimed(swap)

	return Response(ShiftSwapRequestListSerializer(swap).data, status=status.HTTP_200_OK)




@extend_schema(request=None, responses=ShiftSwapRequestListSerializer)
@api_view(['POST'])
@permission_classes([IsAuthenticated, HasActiveSubscription])
def cancelShiftSwapRequest(request, pk):
	"""The original requester can pull their own request back, but only
	before a colleague has claimed it — once a Manager review is pending,
	it has to go through review (approve/reject), not a unilateral cancel."""
	try:
		swap = ShiftSwapRequest.objects.get(pk=pk, requested_by_id=request.user.id, status=ShiftSwapRequest.Status.PENDING_PEER)
	except ObjectDoesNotExist:
		return Response({'detail': 'Swap request not found or no longer cancellable'}, status=status.HTTP_404_NOT_FOUND)

	swap.status = ShiftSwapRequest.Status.CANCELLED
	swap.save(update_fields=['status', 'updated_at'])
	return Response(ShiftSwapRequestListSerializer(swap).data, status=status.HTTP_200_OK)




@extend_schema(request=None, responses=ShiftSwapRequestListSerializer)
@api_view(['GET'])
@permission_classes([IsManagerOrModerator, HasActiveSubscription])
def listOrgShiftSwapRequests(request):
	pending = ShiftSwapRequest.objects.filter(
		roster__employee__organization=request.user.organization, status=ShiftSwapRequest.Status.PENDING_MANAGER
	)
	recent = ShiftSwapRequest.objects.filter(
		roster__employee__organization=request.user.organization
	).exclude(status=ShiftSwapRequest.Status.PENDING_MANAGER)[:50]

	return Response(
		{
			'pending': ShiftSwapRequestListSerializer(pending, many=True).data,
			'recent': ShiftSwapRequestListSerializer(recent, many=True).data,
		},
		status=status.HTTP_200_OK,
	)




@extend_schema(request=None, responses=ShiftSwapRequestListSerializer)
@api_view(['POST'])
@permission_classes([IsManagerOrModerator, HasActiveSubscription])
def reviewShiftSwapRequest(request, pk):
	action = request.data.get('action')
	if action not in ('approve', 'reject'):
		return Response({'detail': "action must be 'approve' or 'reject'"}, status=status.HTTP_400_BAD_REQUEST)

	try:
		swap = ShiftSwapRequest.objects.select_related('roster').get(
			pk=pk, roster__employee__organization=request.user.organization, status=ShiftSwapRequest.Status.PENDING_MANAGER
		)
	except ObjectDoesNotExist:
		return Response({'detail': 'Swap request not found or not awaiting your approval'}, status=status.HTTP_404_NOT_FOUND)

	swap.status = ShiftSwapRequest.Status.APPROVED if action == 'approve' else ShiftSwapRequest.Status.REJECTED
	swap.manager_note = request.data.get('note') or None
	swap.reviewed_by = request.user
	swap.reviewed_at = timezone.now()
	swap.save(update_fields=['status', 'manager_note', 'reviewed_by', 'reviewed_at', 'updated_at'])

	if swap.status == ShiftSwapRequest.Status.APPROVED:
		roster = swap.roster
		roster.employee_id = swap.claimed_by_id
		roster.save(update_fields=['employee', 'updated_at'])

	notify_swap_reviewed(swap)

	return Response(ShiftSwapRequestListSerializer(swap).data, status=status.HTTP_200_OK)
