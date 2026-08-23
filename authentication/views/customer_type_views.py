from django.core.exceptions import ObjectDoesNotExist

from rest_framework import status
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response

from drf_spectacular.utils import  extend_schema, OpenApiParameter

from authentication.decorators import has_permissions
from authentication.models import CustomerType
from authentication.serializers import CustomerTypeSerializer, CustomerTypeListSerializer
from authentication.filters import CustomerTypeFilter

from commons.pagination import Pagination
from commons.enums import PermissionEnum




# Create your views here.

@extend_schema(
	parameters=[
		OpenApiParameter("page"),
		OpenApiParameter("size"),
  ],
	request=CustomerTypeSerializer,
	responses=CustomerTypeSerializer
)
@api_view(['GET'])
# @permission_classes([IsAuthenticated])
# @has_permissions([PermissionEnum.PERMISSION_LIST.name])
def getAllCustomerType(request):
	customer_types = CustomerType.objects.all()
	total_elements = customer_types.count()

	page = request.query_params.get('page')
	size = request.query_params.get('size')

	# Pagination
	pagination = Pagination()
	pagination.page = page
	pagination.size = size
	customer_types = pagination.paginate_data(customer_types)

	serializer = CustomerTypeListSerializer(customer_types, many=True)

	response = {
		'customer_types': serializer.data,
		'page': pagination.page,
		'size': pagination.size,
		'total_pages': pagination.total_pages,
		'total_elements': total_elements,
	}

	return Response(response, status=status.HTTP_200_OK)




@extend_schema(request=CustomerTypeSerializer, responses=CustomerTypeSerializer)
@api_view(['GET'])
# @permission_classes([IsAuthenticated])
# @has_permissions([PermissionEnum.PERMISSION_DETAILS.name])
def getACustomerType(request, pk):
	try:
		customer_type = CustomerType.objects.get(pk=pk)
		serializer = CustomerTypeSerializer(customer_type)
		return Response(serializer.data, status=status.HTTP_200_OK)
	except ObjectDoesNotExist:
		return Response({'detail': f"CustomerType id - {pk} doesn't exists"}, status=status.HTTP_400_BAD_REQUEST)




@extend_schema(request=CustomerTypeSerializer, responses=CustomerTypeSerializer)
@api_view(['GET'])
# @permission_classes([IsAuthenticated])
# @has_permissions([PermissionEnum.PERMISSION_DETAILS_VIEW.name])
def searchCustomerType(request):
	customer_types = CustomerTypeFilter(request.GET, queryset=CustomerType.objects.all())
	customer_types = customer_types.qs

	print('searched_products: ', customer_types)

	total_elements = customer_types.count()

	page = request.query_params.get('page')
	size = request.query_params.get('size')

	# Pagination
	pagination = Pagination()
	pagination.page = page
	pagination.size = size
	customer_types = pagination.paginate_data(customer_types)

	serializer = CustomerTypeListSerializer(customer_types, many=True)

	response = {
		'customer_types': serializer.data,
		'page': pagination.page,
		'size': pagination.size,
		'total_pages': pagination.total_pages,
		'total_elements': total_elements,
	}

	if len(customer_types) > 0:
		return Response(response, status=status.HTTP_200_OK)
	else:
		return Response({'detail': f"There are no customer-types matching your search"}, status=status.HTTP_400_BAD_REQUEST)




@extend_schema(request=CustomerTypeSerializer, responses=CustomerTypeSerializer)
@api_view(['POST'])
@permission_classes([IsAuthenticated])
# @has_permissions([PermissionEnum.PERMISSION_CREATE.name])
def createCustomerType(request):
	data = request.data
	filtered_data = {}

	for key, value in data.items():
		if value != '' and value != '0':
			filtered_data[key] = value

	serializer = CustomerTypeSerializer(data=filtered_data)

	if serializer.is_valid():
		serializer.save()
		return Response(serializer.data, status=status.HTTP_201_CREATED)
	else:
		return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)




@extend_schema(request=CustomerTypeSerializer, responses=CustomerTypeSerializer)
@api_view(['PUT'])
@permission_classes([IsAuthenticated])
# @has_permissions([PermissionEnum.PERMISSION_UPDATE.name, PermissionEnum.PERMISSION_PARTIAL_UPDATE.name])
def updateCustomerType(request,pk):
	try:
		customer_type = CustomerType.objects.get(pk=pk)
		data = request.data
		serializer = CustomerTypeSerializer(customer_type, data=data)
		if serializer.is_valid():
			serializer.save()
			return Response(serializer.data, status=status.HTTP_200_OK)
		else:
			return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
	except ObjectDoesNotExist:
		return Response({'detail': f"CustomerType id - {pk} doesn't exists"}, status=status.HTTP_400_BAD_REQUEST)




@extend_schema(request=CustomerTypeSerializer, responses=CustomerTypeSerializer)
@api_view(['DELETE'])
@permission_classes([IsAuthenticated])
# @has_permissions([PermissionEnum.PERMISSION_DELETE.name])
def deleteCustomerType(request, pk):
	try:
		customer_type = CustomerType.objects.get(pk=pk)
		customer_type.delete()
		return Response({'detail': f'CustomerType id - {pk} is deleted successfully'}, status=status.HTTP_200_OK)
	except ObjectDoesNotExist:
		return Response({'detail': f"CustomerType id - {pk} doesn't exists"}, status=status.HTTP_400_BAD_REQUEST)



