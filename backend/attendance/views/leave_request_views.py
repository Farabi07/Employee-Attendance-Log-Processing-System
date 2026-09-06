from django.core.exceptions import ObjectDoesNotExist
from django.utils import timezone

from rest_framework import status
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response

from drf_spectacular.utils import extend_schema, OpenApiParameter

from attendance.models import LeaveRequest, LeaveType
from attendance.serializers import LeaveRequestSerializer, LeaveRequestListSerializer
from attendance.filters import LeaveRequestFilter
from attendance.notify import notify_leave_submitted, notify_leave_reviewed
from authentication.permissions import IsManagerOrModerator, HasActiveSubscription

from commons.pagination import Pagination


# select_related on every list endpoint below: LeaveRequestListSerializer
# nests employee/leave_type/reviewed_by, so without this each row would
# fire 3 extra queries (classic N+1) instead of one JOINed query.
LEAVE_REQUEST_SELECT_RELATED = ('employee', 'leave_type', 'reviewed_by')


def _leave_balance_rows(employee):
	"""Per-LeaveType quota vs. used-this-calendar-year, for the employee's
	own Leave tab and for the leave-type picker when requesting. Only
	Approved requests count against the quota; a still-pending request
	doesn't reserve days ahead of a manager's decision."""
	today = timezone.localdate()
	year_start = today.replace(month=1, day=1)
	year_end = today.replace(month=12, day=31)

	leave_types = LeaveType.objects.filter(organization=employee.organization_id)
	approved = LeaveRequest.objects.filter(
		employee=employee, status=LeaveRequest.Status.APPROVED,
		start_date__lte=year_end, end_date__gte=year_start,
	).select_related('leave_type')

	used_by_type = {}
	for lr in approved:
		if not lr.leave_type_id:
			continue
		start = max(lr.start_date, year_start)
		end = min(lr.end_date, year_end)
		days = (end - start).days + 1
		used_by_type[lr.leave_type_id] = used_by_type.get(lr.leave_type_id, 0) + days

	rows = []
	for lt in leave_types:
		used = used_by_type.get(lt.id, 0)
		rows.append(
			{
				'leave_type_id': lt.id,
				'name': lt.name,
				'days_per_year': lt.days_per_year,
				'used': used,
				'remaining': max(lt.days_per_year - used, 0) if lt.days_per_year else None,
			}
		)
	return rows




# Create your views here.

@extend_schema(
	parameters=[
		OpenApiParameter("page"),
		OpenApiParameter("size"),
  ],
	request=LeaveRequestListSerializer,
	responses=LeaveRequestListSerializer
)
@api_view(['GET'])
@permission_classes([IsManagerOrModerator, HasActiveSubscription])
def getAllLeaveRequest(request):
	leave_requests = LeaveRequestFilter(request.GET, queryset=LeaveRequest.objects.filter(employee__organization=request.user.organization).select_related(*LEAVE_REQUEST_SELECT_RELATED))
	leave_requests = leave_requests.qs
	total_elements = leave_requests.count()

	page = request.query_params.get('page')
	size = request.query_params.get('size')

	pagination = Pagination()
	pagination.page = page
	pagination.size = size
	leave_requests = pagination.paginate_data(leave_requests)

	serializer = LeaveRequestListSerializer(leave_requests, many=True)

	response = {
		'leave_requests': serializer.data,
		'page': pagination.page,
		'size': pagination.size,
		'total_pages': pagination.total_pages,
		'total_elements': total_elements,
	}

	return Response(response, status=status.HTTP_200_OK)




@extend_schema(request=LeaveRequestListSerializer, responses=LeaveRequestListSerializer)
@api_view(['GET'])
@permission_classes([IsManagerOrModerator, HasActiveSubscription])
def getAllLeaveRequestWithoutPagination(request):
	leave_requests = LeaveRequest.objects.filter(employee__organization=request.user.organization).select_related(*LEAVE_REQUEST_SELECT_RELATED)

	serializer = LeaveRequestListSerializer(leave_requests, many=True)

	response = {
		'leave_requests': serializer.data,
	}

	return Response(response, status=status.HTTP_200_OK)




@extend_schema(
	parameters=[
		OpenApiParameter("page"),
		OpenApiParameter("size"),
  ],
	request=LeaveRequestListSerializer,
	responses=LeaveRequestListSerializer
)
@api_view(['GET'])
@permission_classes([IsAuthenticated, HasActiveSubscription])
def getAllLeaveRequestByEmployeeId(request, employee_id):
	leave_requests = LeaveRequest.objects.filter(employee__id=employee_id, employee__organization=request.user.organization).select_related(*LEAVE_REQUEST_SELECT_RELATED)
	total_elements = leave_requests.count()

	page = request.query_params.get('page')
	size = request.query_params.get('size')

	pagination = Pagination()
	pagination.page = page
	pagination.size = size
	leave_requests = pagination.paginate_data(leave_requests)

	serializer = LeaveRequestListSerializer(leave_requests, many=True)

	response = {
		'leave_requests': serializer.data,
		'page': pagination.page,
		'size': pagination.size,
		'total_pages': pagination.total_pages,
		'total_elements': total_elements,
	}

	return Response(response, status=status.HTTP_200_OK)




@extend_schema(request=LeaveRequestSerializer, responses=LeaveRequestSerializer)
@api_view(['GET'])
@permission_classes([IsAuthenticated, HasActiveSubscription])
def getALeaveRequest(request, pk):
	try:
		leave_request = LeaveRequest.objects.get(pk=pk, employee__organization=request.user.organization)
		serializer = LeaveRequestListSerializer(leave_request)
		return Response(serializer.data, status=status.HTTP_200_OK)
	except ObjectDoesNotExist:
		return Response({'detail': f"LeaveRequest id - {pk} does't exists"}, status=status.HTTP_400_BAD_REQUEST)




@extend_schema(request=LeaveRequestSerializer, responses=LeaveRequestSerializer)
@api_view(['POST'])
@permission_classes([IsAuthenticated, HasActiveSubscription])
def createLeaveRequest(request):
	data = request.data.copy()
	data.setdefault('employee', request.user.pk)

	serializer = LeaveRequestSerializer(data=data)

	if serializer.is_valid():
		leave_request = serializer.save()
		notify_leave_submitted(leave_request)
		return Response(serializer.data, status=status.HTTP_201_CREATED)
	else:
		return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)




@extend_schema(request=LeaveRequestSerializer, responses=LeaveRequestSerializer)
@api_view(['PUT'])
@permission_classes([IsAuthenticated, HasActiveSubscription])
def updateLeaveRequest(request, pk):
	data = request.data

	try:
		leave_request = LeaveRequest.objects.get(pk=pk, employee__organization=request.user.organization)
	except ObjectDoesNotExist:
		return Response({'detail': f"LeaveRequest id - {pk} doesn't exists"}, status=status.HTTP_400_BAD_REQUEST)

	serializer = LeaveRequestSerializer(leave_request, data=data, partial=True)
	if serializer.is_valid():
		serializer.save()
		return Response(serializer.data, status=status.HTTP_200_OK)
	else:
		return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)




@extend_schema(request=LeaveRequestSerializer, responses=LeaveRequestSerializer)
@api_view(['POST'])
@permission_classes([IsManagerOrModerator, HasActiveSubscription])
def reviewLeaveRequest(request, pk):
	data = request.data
	review_status = data.get('status')

	if review_status not in (LeaveRequest.Status.APPROVED, LeaveRequest.Status.REJECTED):
		return Response(
			{'detail': "status must be either 'approved' or 'rejected'"},
			status=status.HTTP_400_BAD_REQUEST
		)

	try:
		leave_request = LeaveRequest.objects.get(pk=pk, employee__organization=request.user.organization)
	except ObjectDoesNotExist:
		return Response({'detail': f"LeaveRequest id - {pk} doesn't exists"}, status=status.HTTP_400_BAD_REQUEST)

	leave_request.status = review_status
	leave_request.review_note = data.get('review_note')
	leave_request.reviewed_by = request.user
	leave_request.reviewed_at = timezone.now()
	leave_request.updated_by = request.user
	leave_request.save()

	notify_leave_reviewed(leave_request)

	serializer = LeaveRequestListSerializer(leave_request)
	return Response(serializer.data, status=status.HTTP_200_OK)




@extend_schema(request=LeaveRequestSerializer, responses=LeaveRequestSerializer)
@api_view(['DELETE'])
@permission_classes([IsAuthenticated, HasActiveSubscription])
def deleteLeaveRequest(request, pk):
	try:
		leave_request = LeaveRequest.objects.get(pk=pk, employee__organization=request.user.organization)
		leave_request.delete()
		return Response({'detail': f'LeaveRequest id - {pk} is deleted successfully'}, status=status.HTTP_200_OK)
	except ObjectDoesNotExist:
		return Response({'detail': f"LeaveRequest id - {pk} does't exists"}, status=status.HTTP_400_BAD_REQUEST)




@extend_schema(request=None, responses=None)
@api_view(['GET'])
@permission_classes([IsAuthenticated, HasActiveSubscription])
def getMyLeaveBalance(request):
	"""Per-leave-type quota vs. used-this-year for the current employee —
	what the Leave tab shows ('You've used 3 of 10 Casual days') and what
	the leave-request form uses to label each type in the picker."""
	return Response({'balance': _leave_balance_rows(request.user)}, status=status.HTTP_200_OK)
