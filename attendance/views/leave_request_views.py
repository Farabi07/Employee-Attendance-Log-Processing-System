from django.core.exceptions import ObjectDoesNotExist
from django.utils import timezone

from rest_framework import status
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response

from drf_spectacular.utils import extend_schema, OpenApiParameter

from attendance.models import LeaveRequest
from attendance.serializers import LeaveRequestSerializer, LeaveRequestListSerializer
from attendance.filters import LeaveRequestFilter
from attendance.notify import notify_leave_submitted, notify_leave_reviewed
from authentication.permissions import IsManagerOrModerator, HasActiveSubscription

from commons.pagination import Pagination




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
	leave_requests = LeaveRequestFilter(request.GET, queryset=LeaveRequest.objects.filter(employee__organization=request.user.organization))
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
	leave_requests = LeaveRequest.objects.filter(employee__organization=request.user.organization)

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
	leave_requests = LeaveRequest.objects.filter(employee__id=employee_id, employee__organization=request.user.organization)
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
