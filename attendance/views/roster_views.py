from django.core.exceptions import ObjectDoesNotExist

from rest_framework import status
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated, IsAdminUser
from rest_framework.response import Response

from drf_spectacular.utils import extend_schema, OpenApiParameter

from attendance.models import Roster
from attendance.serializers import RosterSerializer, RosterListSerializer

from commons.pagination import Pagination




# Create your views here.

@extend_schema(
	parameters=[
		OpenApiParameter("page"),
		OpenApiParameter("size"),
  ],
	request=RosterListSerializer,
	responses=RosterListSerializer
)
@api_view(['GET'])
@permission_classes([IsAuthenticated])
def getAllRoster(request):
	rosters = Roster.objects.all()
	total_elements = rosters.count()

	page = request.query_params.get('page')
	size = request.query_params.get('size')

	pagination = Pagination()
	pagination.page = page
	pagination.size = size
	rosters = pagination.paginate_data(rosters)

	serializer = RosterListSerializer(rosters, many=True)

	response = {
		'rosters': serializer.data,
		'page': pagination.page,
		'size': pagination.size,
		'total_pages': pagination.total_pages,
		'total_elements': total_elements,
	}

	return Response(response, status=status.HTTP_200_OK)




@extend_schema(request=RosterListSerializer, responses=RosterListSerializer)
@api_view(['GET'])
@permission_classes([IsAuthenticated])
def getAllRosterWithoutPagination(request):
	rosters = Roster.objects.all()

	serializer = RosterListSerializer(rosters, many=True)

	response = {
		'rosters': serializer.data,
	}

	return Response(response, status=status.HTTP_200_OK)




@extend_schema(
	parameters=[
		OpenApiParameter("page"),
		OpenApiParameter("size"),
  ],
	request=RosterListSerializer,
	responses=RosterListSerializer
)
@api_view(['GET'])
@permission_classes([IsAuthenticated])
def getAllRosterByEmployeeId(request, employee_id):
	rosters = Roster.objects.filter(employee__id=employee_id)
	total_elements = rosters.count()

	page = request.query_params.get('page')
	size = request.query_params.get('size')

	pagination = Pagination()
	pagination.page = page
	pagination.size = size
	rosters = pagination.paginate_data(rosters)

	serializer = RosterListSerializer(rosters, many=True)

	response = {
		'rosters': serializer.data,
		'page': pagination.page,
		'size': pagination.size,
		'total_pages': pagination.total_pages,
		'total_elements': total_elements,
	}

	return Response(response, status=status.HTTP_200_OK)




@extend_schema(request=RosterSerializer, responses=RosterSerializer)
@api_view(['GET'])
@permission_classes([IsAuthenticated])
def getARoster(request, pk):
	try:
		roster = Roster.objects.get(pk=pk)
		serializer = RosterListSerializer(roster)
		return Response(serializer.data, status=status.HTTP_200_OK)
	except ObjectDoesNotExist:
		return Response({'detail': f"Roster id - {pk} does't exists"}, status=status.HTTP_400_BAD_REQUEST)




@extend_schema(request=RosterSerializer, responses=RosterSerializer)
@api_view(['POST'])
@permission_classes([IsAdminUser])
def createRoster(request):
	data = request.data

	serializer = RosterSerializer(data=data)

	if serializer.is_valid():
		serializer.save()
		return Response(serializer.data, status=status.HTTP_201_CREATED)
	else:
		return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)




@extend_schema(request=RosterSerializer, responses=RosterSerializer)
@api_view(['PUT'])
@permission_classes([IsAdminUser])
def updateRoster(request, pk):
	data = request.data

	try:
		roster = Roster.objects.get(pk=pk)
	except ObjectDoesNotExist:
		return Response({'detail': f"Roster id - {pk} doesn't exists"}, status=status.HTTP_400_BAD_REQUEST)

	serializer = RosterSerializer(roster, data=data)
	if serializer.is_valid():
		serializer.save()
		return Response(serializer.data, status=status.HTTP_200_OK)
	else:
		return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)




@extend_schema(request=RosterSerializer, responses=RosterSerializer)
@api_view(['DELETE'])
@permission_classes([IsAdminUser])
def deleteRoster(request, pk):
	try:
		roster = Roster.objects.get(pk=pk)
		roster.delete()
		return Response({'detail': f'Roster id - {pk} is deleted successfully'}, status=status.HTTP_200_OK)
	except ObjectDoesNotExist:
		return Response({'detail': f"Roster id - {pk} does't exists"}, status=status.HTTP_400_BAD_REQUEST)
