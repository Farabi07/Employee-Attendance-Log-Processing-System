from django.core.exceptions import ObjectDoesNotExist

from rest_framework import status
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated, IsAdminUser
from rest_framework.response import Response

from drf_spectacular.utils import extend_schema, OpenApiParameter

from attendance.models import Shift
from attendance.serializers import ShiftSerializer, ShiftListSerializer
from attendance.filters import ShiftFilter

from commons.pagination import Pagination




# Create your views here.

@extend_schema(
	parameters=[
		OpenApiParameter("page"),
		OpenApiParameter("size"),
  ],
	request=ShiftListSerializer,
	responses=ShiftListSerializer
)
@api_view(['GET'])
@permission_classes([IsAuthenticated])
def getAllShift(request):
	shifts = Shift.objects.all()
	total_elements = shifts.count()

	page = request.query_params.get('page')
	size = request.query_params.get('size')

	pagination = Pagination()
	pagination.page = page
	pagination.size = size
	shifts = pagination.paginate_data(shifts)

	serializer = ShiftListSerializer(shifts, many=True)

	response = {
		'shifts': serializer.data,
		'page': pagination.page,
		'size': pagination.size,
		'total_pages': pagination.total_pages,
		'total_elements': total_elements,
	}

	return Response(response, status=status.HTTP_200_OK)




@extend_schema(request=ShiftListSerializer, responses=ShiftListSerializer)
@api_view(['GET'])
@permission_classes([IsAuthenticated])
def getAllShiftWithoutPagination(request):
	shifts = Shift.objects.all()

	serializer = ShiftListSerializer(shifts, many=True)

	response = {
		'shifts': serializer.data,
	}

	return Response(response, status=status.HTTP_200_OK)




@extend_schema(request=ShiftSerializer, responses=ShiftSerializer)
@api_view(['GET'])
@permission_classes([IsAuthenticated])
def getAShift(request, pk):
	try:
		shift = Shift.objects.get(pk=pk)
		serializer = ShiftListSerializer(shift)
		return Response(serializer.data, status=status.HTTP_200_OK)
	except ObjectDoesNotExist:
		return Response({'detail': f"Shift id - {pk} does't exists"}, status=status.HTTP_400_BAD_REQUEST)




@extend_schema(request=ShiftSerializer, responses=ShiftSerializer)
@api_view(['POST'])
@permission_classes([IsAdminUser])
def createShift(request):
	data = request.data

	serializer = ShiftSerializer(data=data)

	if serializer.is_valid():
		serializer.save()
		return Response(serializer.data, status=status.HTTP_201_CREATED)
	else:
		return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)




@extend_schema(request=ShiftSerializer, responses=ShiftSerializer)
@api_view(['PUT'])
@permission_classes([IsAdminUser])
def updateShift(request, pk):
	data = request.data

	try:
		shift = Shift.objects.get(pk=pk)
	except ObjectDoesNotExist:
		return Response({'detail': f"Shift id - {pk} doesn't exists"}, status=status.HTTP_400_BAD_REQUEST)

	serializer = ShiftSerializer(shift, data=data)
	if serializer.is_valid():
		serializer.save()
		return Response(serializer.data, status=status.HTTP_200_OK)
	else:
		return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)




@extend_schema(request=ShiftSerializer, responses=ShiftSerializer)
@api_view(['DELETE'])
@permission_classes([IsAdminUser])
def deleteShift(request, pk):
	try:
		shift = Shift.objects.get(pk=pk)
		shift.delete()
		return Response({'detail': f'Shift id - {pk} is deleted successfully'}, status=status.HTTP_200_OK)
	except ObjectDoesNotExist:
		return Response({'detail': f"Shift id - {pk} does't exists"}, status=status.HTTP_400_BAD_REQUEST)
