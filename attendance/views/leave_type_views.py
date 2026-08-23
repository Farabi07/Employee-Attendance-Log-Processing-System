from django.core.exceptions import ObjectDoesNotExist

from rest_framework import status
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated, IsAdminUser
from rest_framework.response import Response

from drf_spectacular.utils import extend_schema, OpenApiParameter

from attendance.models import LeaveType
from attendance.serializers import LeaveTypeSerializer, LeaveTypeListSerializer

from commons.pagination import Pagination




# Create your views here.

@extend_schema(
	parameters=[
		OpenApiParameter("page"),
		OpenApiParameter("size"),
  ],
	request=LeaveTypeListSerializer,
	responses=LeaveTypeListSerializer
)
@api_view(['GET'])
@permission_classes([IsAuthenticated])
def getAllLeaveType(request):
	leave_types = LeaveType.objects.all()
	total_elements = leave_types.count()

	page = request.query_params.get('page')
	size = request.query_params.get('size')

	pagination = Pagination()
	pagination.page = page
	pagination.size = size
	leave_types = pagination.paginate_data(leave_types)

	serializer = LeaveTypeListSerializer(leave_types, many=True)

	response = {
		'leave_types': serializer.data,
		'page': pagination.page,
		'size': pagination.size,
		'total_pages': pagination.total_pages,
		'total_elements': total_elements,
	}

	return Response(response, status=status.HTTP_200_OK)




@extend_schema(request=LeaveTypeListSerializer, responses=LeaveTypeListSerializer)
@api_view(['GET'])
@permission_classes([IsAuthenticated])
def getAllLeaveTypeWithoutPagination(request):
	leave_types = LeaveType.objects.all()

	serializer = LeaveTypeListSerializer(leave_types, many=True)

	response = {
		'leave_types': serializer.data,
	}

	return Response(response, status=status.HTTP_200_OK)




@extend_schema(request=LeaveTypeSerializer, responses=LeaveTypeSerializer)
@api_view(['GET'])
@permission_classes([IsAuthenticated])
def getALeaveType(request, pk):
	try:
		leave_type = LeaveType.objects.get(pk=pk)
		serializer = LeaveTypeListSerializer(leave_type)
		return Response(serializer.data, status=status.HTTP_200_OK)
	except ObjectDoesNotExist:
		return Response({'detail': f"LeaveType id - {pk} does't exists"}, status=status.HTTP_400_BAD_REQUEST)




@extend_schema(request=LeaveTypeSerializer, responses=LeaveTypeSerializer)
@api_view(['POST'])
@permission_classes([IsAdminUser])
def createLeaveType(request):
	data = request.data

	serializer = LeaveTypeSerializer(data=data)

	if serializer.is_valid():
		serializer.save()
		return Response(serializer.data, status=status.HTTP_201_CREATED)
	else:
		return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)




@extend_schema(request=LeaveTypeSerializer, responses=LeaveTypeSerializer)
@api_view(['PUT'])
@permission_classes([IsAdminUser])
def updateLeaveType(request, pk):
	data = request.data

	try:
		leave_type = LeaveType.objects.get(pk=pk)
	except ObjectDoesNotExist:
		return Response({'detail': f"LeaveType id - {pk} doesn't exists"}, status=status.HTTP_400_BAD_REQUEST)

	serializer = LeaveTypeSerializer(leave_type, data=data)
	if serializer.is_valid():
		serializer.save()
		return Response(serializer.data, status=status.HTTP_200_OK)
	else:
		return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)




@extend_schema(request=LeaveTypeSerializer, responses=LeaveTypeSerializer)
@api_view(['DELETE'])
@permission_classes([IsAdminUser])
def deleteLeaveType(request, pk):
	try:
		leave_type = LeaveType.objects.get(pk=pk)
		leave_type.delete()
		return Response({'detail': f'LeaveType id - {pk} is deleted successfully'}, status=status.HTTP_200_OK)
	except ObjectDoesNotExist:
		return Response({'detail': f"LeaveType id - {pk} does't exists"}, status=status.HTTP_400_BAD_REQUEST)
