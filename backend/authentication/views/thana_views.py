from django.core.exceptions import ObjectDoesNotExist

from rest_framework import serializers, status
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response

from drf_spectacular.utils import OpenApiParameter, extend_schema

from authentication.decorators import has_permissions
from authentication.models import Thana
from authentication.serializers import ThanaListSerializer, ThanaSerializer
from authentication.filters import ThanaFilter

from commons.enums import PermissionEnum
from commons.pagination import Pagination




# Create your views here.

@extend_schema(
	parameters=[
		OpenApiParameter("page"),
		OpenApiParameter("size"),
  ],
	request=ThanaSerializer,
	responses=ThanaSerializer
)
@api_view(['GET'])
# @permission_classes([IsAuthenticated])
# @has_permissions([PermissionEnum.PERMISSION_LIST_VIEW.name])
def getAllThana(request):
	thanas = Thana.objects.all()
	total_elements = thanas.count()

	page = request.query_params.get('page')
	size = request.query_params.get('size')

	# Pagination
	pagination = Pagination()
	pagination.page = page
	pagination.size = size
	thanas = pagination.paginate_data(thanas)

	serializer = ThanaListSerializer(thanas, many=True)

	response = {
		'thanas': serializer.data,
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
	request=ThanaSerializer,
	responses=ThanaSerializer
)
@api_view(['GET'])
# @permission_classes([IsAuthenticated])
# @has_permissions([PermissionEnum.PERMISSION_LIST_VIEW.name])
def getAllThanaWithoutPagination(request):
	thanas = Thana.objects.all()

	serializer = ThanaListSerializer(thanas, many=True)

	return Response({'thanas':serializer.data}, status=status.HTTP_200_OK)




@extend_schema(
	parameters=[
		OpenApiParameter("page"),
		OpenApiParameter("size"),
  ],
	request=ThanaSerializer,
	responses=ThanaSerializer
)
@api_view(['GET'])
# @permission_classes([IsAuthenticated])
# @has_permissions([PermissionEnum.PERMISSION_LIST_VIEW.name])
def getAllThanaByCityIdWithoutPagination(request, city_id):
	thanas = Thana.objects.filter(city__id=city_id)

	serializer = ThanaListSerializer(thanas, many=True)

	return Response({'thanas':serializer.data}, status=status.HTTP_200_OK)




@extend_schema(request=ThanaSerializer, responses=ThanaSerializer)
@api_view(['GET'])
# @permission_classes([IsAuthenticated])
# @has_permissions([PermissionEnum.PERMISSION_DETAILS_VIEW.name])
def getAThana(request, pk):
	try:
		thana = Thana.objects.get(pk=pk)
		serializer = ThanaSerializer(thana)
		return Response(serializer.data, status=status.HTTP_200_OK)
	except ObjectDoesNotExist:
		return Response({'detail': f"Thana id - {pk} doesn't exists"}, status=status.HTTP_400_BAD_REQUEST)




@extend_schema(request=ThanaSerializer, responses=ThanaSerializer)
@api_view(['GET'])
# @permission_classes([IsAuthenticated])
# @has_permissions([PermissionEnum.PRODUCT_DETAILS.name])
def searchThana(request):

	thanas = ThanaFilter(request.GET, queryset=Thana.objects.all())
	thanas = thanas.qs

	print('thanas: ', thanas)

	total_elements = thanas.count()

	page = request.query_params.get('page')
	size = request.query_params.get('size')

	# Pagination
	pagination = Pagination()
	pagination.page = page
	pagination.size = size
	thanas = pagination.paginate_data(thanas)

	serializer = ThanaListSerializer(thanas, many=True)

	response = {
		'thanas': serializer.data,
		'page': pagination.page,
		'size': pagination.size,
		'total_pages': pagination.total_pages,
		'total_elements': total_elements,
	}

	if len(thanas) > 0:
		return Response(response, status=status.HTTP_200_OK)
	else:
		return Response({'detail': f"There are no thanas matching your search"}, status=status.HTTP_400_BAD_REQUEST)




@extend_schema(request=ThanaSerializer, responses=ThanaSerializer)
@api_view(['POST'])
# @permission_classes([IsAuthenticated])
# @has_permissions([PermissionEnum.PERMISSION_CREATE.name])
def createThana(request):
	data = request.data
	filtered_data = {}

	for key, value in data.items():
		if value != '' and value != '0':
			filtered_data[key] = value

	serializer = ThanaSerializer(data=filtered_data)

	if serializer.is_valid():
		serializer.save()
		return Response(serializer.data, status=status.HTTP_201_CREATED)
	else:
		return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)




@extend_schema(request=ThanaSerializer, responses=ThanaSerializer)
@api_view(['PUT'])
@permission_classes([IsAuthenticated])
# @has_permissions([PermissionEnum.PERMISSION_UPDATE.name, PermissionEnum.PERMISSION_PARTIAL_UPDATE.name])
def updateThana(request,pk):
	try:
		thana = Thana.objects.get(pk=pk)
		data = request.data
		serializer = ThanaSerializer(thana, data=data)
		if serializer.is_valid():
			serializer.save()
			return Response(serializer.data, status=status.HTTP_200_OK)
		else:
			return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
	except ObjectDoesNotExist:
		return Response({'detail': f"Thana id - {pk} doesn't exists"}, status=status.HTTP_400_BAD_REQUEST)




@extend_schema(request=ThanaSerializer, responses=ThanaSerializer)
@api_view(['DELETE'])
@permission_classes([IsAuthenticated])
# @has_permissions([PermissionEnum.PERMISSION_DELETE.name])
def deleteThana(request, pk):
	try:
		thana = Thana.objects.get(pk=pk)
		thana.delete()
		return Response({'detail': f'Thana id - {pk} is deleted successfully'}, status=status.HTTP_200_OK)
	except ObjectDoesNotExist:
		return Response({'detail': f"Thana id - {pk} doesn't exists"}, status=status.HTTP_400_BAD_REQUEST)
