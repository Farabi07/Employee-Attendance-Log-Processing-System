from django.core.exceptions import ObjectDoesNotExist, ValidationError

from rest_framework import serializers, status
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response

from drf_spectacular.utils import OpenApiParameter, extend_schema

from authentication.decorators import has_permissions
from authentication.models import Area
from authentication.serializers import AreaSerializer, AreaListSerializer
from authentication.filters import AreaFilter

from commons.enums import PermissionEnum
from commons.pagination import Pagination




# Create your views here.

@extend_schema(
	parameters=[
		OpenApiParameter("page"),
		OpenApiParameter("size"),
  ],
	request=AreaSerializer,
	responses=AreaSerializer
)
@api_view(['GET'])
# @permission_classes([IsAuthenticated])
# @has_permissions([PermissionEnum.PERMISSION_LIST_VIEW.name])
def getAllArea(request):
	areas = Area.objects.all()
	total_elements = areas.count()

	page = request.query_params.get('page')
	size = request.query_params.get('size')

	# Pagination
	pagination = Pagination()
	pagination.page = page
	pagination.size = size
	areas = pagination.paginate_data(areas)

	serializer = AreaListSerializer(areas, many=True)

	response = {
		'areas': serializer.data,
		'page': pagination.page,
		'size': pagination.size,
		'total_pages': pagination.total_pages,
		'total_elements': total_elements,
	}

	return Response(response, status=status.HTTP_200_OK)

@extend_schema(
	parameters=[
		OpenApiParameter("page"),
		OpenApiParameter("size"),
  ],
	request=AreaSerializer,
	responses=AreaSerializer
)
@api_view(['GET'])
# @permission_classes([IsAuthenticated])
# @has_permissions([PermissionEnum.PERMISSION_LIST_VIEW.name])
def getAllAreaWithoutPagination(request):
	areas = Area.objects.all()

	serializer = AreaListSerializer(areas, many=True)

	return Response({'areas': serializer.data}, status=status.HTTP_200_OK)


@extend_schema(request=AreaSerializer, responses=AreaSerializer)
@api_view(['GET'])
# @permission_classes([IsAuthenticated])
# @has_permissions([PermissionEnum.PERMISSION_DETAILS_VIEW.name])
def getAArea(request, pk):
	try:
		area = Area.objects.get(pk=pk)
		serializer = AreaSerializer(area)
		return Response(serializer.data, status=status.HTTP_200_OK)
	except ObjectDoesNotExist:
		return Response({'detail': f"Area id - {pk} doesn't exists"}, status=status.HTTP_400_BAD_REQUEST)


@extend_schema(request=AreaSerializer, responses=AreaSerializer)
@api_view(['GET'])
# @permission_classes([IsAuthenticated])
# @has_permissions([PermissionEnum.PERMISSION_DETAILS_VIEW.name])
def searchArea(request):
	areas = AreaFilter(request.GET, queryset=Area.objects.all())
	areas = areas.qs

	print('searched_products: ', areas)

	total_elements = areas.count()

	page = request.query_params.get('page')
	size = request.query_params.get('size')

	# Pagination
	pagination = Pagination()
	pagination.page = page
	pagination.size = size
	areas = pagination.paginate_data(areas)

	serializer = AreaListSerializer(areas, many=True)

	response = {
		'areas': serializer.data,
		'page': pagination.page,
		'size': pagination.size,
		'total_pages': pagination.total_pages,
		'total_elements': total_elements,
	}

	if len(areas) > 0:
		return Response(response, status=status.HTTP_200_OK)
	else:
		return Response({'detail': f"There are no areas matching your search"}, status=status.HTTP_400_BAD_REQUEST)


@extend_schema(request=AreaSerializer, responses=AreaSerializer)
@api_view(['POST'])
@permission_classes([IsAuthenticated])
# @has_permissions([PermissionEnum.PERMISSION_CREATE.name])
def createArea(request):
	data = request.data
	filtered_data = {}
	for key, value in data.items():
		if value != '' and value != '0':
			filtered_data[key] = value
			
	serializer = AreaSerializer(data=filtered_data)

	if serializer.is_valid():
		serializer.save()
		return Response(serializer.data, status=status.HTTP_201_CREATED)
	else:
		return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)




@extend_schema(request=AreaSerializer, responses=AreaSerializer)
@api_view(['PUT'])
@permission_classes([IsAuthenticated])
# @has_permissions([PermissionEnum.PERMISSION_UPDATE.name, PermissionEnum.PERMISSION_PARTIAL_UPDATE.name])
def updateArea(request,pk):
	try:
		area = Area.objects.get(pk=pk)
		data = request.data
		serializer = AreaSerializer(area, data=data)
		if serializer.is_valid():
			serializer.save()
			return Response(serializer.data, status=status.HTTP_200_OK)
		else:
			return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
	except ObjectDoesNotExist:
		return Response({'detail': f"Area id - {pk} doesn't exists"}, status=status.HTTP_400_BAD_REQUEST)




@extend_schema(request=AreaSerializer, responses=AreaSerializer)
@api_view(['DELETE'])
@permission_classes([IsAuthenticated])
# @has_permissions([PermissionEnum.PERMISSION_DELETE.name])
def deleteArea(request, pk):
	try:
		area = Area.objects.get(pk=pk)
		area.delete()
		return Response({'detail': f'Area id - {pk} is deleted successfully'}, status=status.HTTP_200_OK)
	except ObjectDoesNotExist:
		return Response({'detail': f"Area id - {pk} doesn't exists"}, status=status.HTTP_400_BAD_REQUEST)
