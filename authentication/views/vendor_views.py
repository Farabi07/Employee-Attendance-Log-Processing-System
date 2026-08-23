from django.core.exceptions import ObjectDoesNotExist
from django.utils import timezone

from rest_framework import status
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response

from drf_spectacular.utils import  extend_schema, OpenApiParameter

from authentication.models import Vendor
from authentication.serializers import VendorSerializer, VendorListSerializer
from authentication.filters import VendorFilter
from authentication.decorators import has_permissions

from commons.pagination import Pagination
from commons.enums import PermissionEnum




# Create your views here.

@extend_schema(
	parameters=[
		OpenApiParameter("page"),
		OpenApiParameter("size"),
  ],
	request=VendorSerializer,
	responses=VendorSerializer
)
@api_view(['GET'])
# @permission_classes([IsAuthenticated])
# @has_permissions([PermissionEnum.PERMISSION_LIST.name])
def getAllVendor(request):
	vendors = Vendor.objects.all()
	total_elements = vendors.count()

	page = request.query_params.get('page')
	size = request.query_params.get('size')

	# Pagination
	pagination = Pagination()
	pagination.page = page
	pagination.size = size
	vendors = pagination.paginate_data(vendors)

	serializer = VendorListSerializer(vendors, many=True)

	response = {
		'vendors': serializer.data,
		'page': pagination.page,
		'size': pagination.size,
		'total_pages': pagination.total_pages,
		'total_elements': total_elements,
	}

	return Response(response, status=status.HTTP_200_OK)




@extend_schema(
	request=VendorSerializer,
	responses=VendorSerializer
)
@api_view(['GET'])
# @permission_classes([IsAuthenticated])
# @has_permissions([PermissionEnum.PERMISSION_LIST.name])
def getAllVendorWithoutPagination(request):
	vendors = Vendor.objects.all()

	serializer = VendorListSerializer(vendors, many=True)

	return Response({'vendors': serializer.data}, status=status.HTTP_200_OK)




@extend_schema(request=VendorSerializer, responses=VendorSerializer)
@api_view(['GET'])
# @permission_classes([IsAuthenticated])
# @has_permissions([PermissionEnum.PERMISSION_DETAILS.name])
def getAVendor(request, pk):
	try:
		vendor = Vendor.objects.get(pk=pk)
		serializer = VendorSerializer(vendor)
		return Response(serializer.data, status=status.HTTP_200_OK)
	except ObjectDoesNotExist:
		return Response({'detail': f"Vendor id - {pk} doesn't exists"}, status=status.HTTP_400_BAD_REQUEST)




@extend_schema(request=VendorSerializer, responses=VendorSerializer)
@api_view(['GET'])
# @permission_classes([IsAuthenticated])
# @has_permissions([PermissionEnum.PERMISSION_DETAILS_VIEW.name])
def searchVendor(request):
	vendors = VendorFilter(request.GET, queryset=Vendor.objects.all())
	vendors = vendors.qs

	print('searched_products: ', vendors)

	total_elements = vendors.count()

	page = request.query_params.get('page')
	size = request.query_params.get('size')

	# Pagination
	pagination = Pagination()
	pagination.page = page
	pagination.size = size
	vendors = pagination.paginate_data(vendors)

	serializer = VendorListSerializer(vendors, many=True)

	response = {
		'vendors': serializer.data,
		'page': pagination.page,
		'size': pagination.size,
		'total_pages': pagination.total_pages,
		'total_elements': total_elements,
	}

	if len(vendors) > 0:
		return Response(response, status=status.HTTP_200_OK)
	else:
		return Response({'detail': f"There are no vendor matching your search"}, status=status.HTTP_400_BAD_REQUEST)




@extend_schema(request=VendorSerializer, responses=VendorSerializer)
@api_view(['POST'])
# @permission_classes([IsAuthenticated])
# @has_permissions([PermissionEnum.PERMISSION_CREATE.name])
def createVendor(request):
	data = request.data

	print('data :', data) 

	vendor_data_dict = {}

	current_datetime = timezone.now()
	current_datetime = str(current_datetime)
	print('current_datetime str: ', current_datetime)

	try:
		group_obj = Group.objects.get(name='Sundry Creditors')
	except Group.ObjectDoesNotExist:
		return Response("Please insert a 'Purchase Accounts' data in the Group table and then try again")

	username = data.get('username', None)
	if username is None:
		return Response("Please insert username.")

	for key, value in data.items():
		if value != '' and value != '0':
			vendor_data_dict[key] = value
		
	vendor_data_dict['last_login'] = current_datetime

	print('vendor_data_dict: ', vendor_data_dict)

	serializer = VendorSerializer(data=vendor_data_dict, many=False)

	if serializer.is_valid():
		serializer.save()

		vendor_obj = Vendor.objects.get(username=username)

		vendor_ledger_obj = LedgerAccount.objects.create(name=username, ledger_type='Vendor Ledger', reference_id=vendor_obj.id, head_group=group_obj)

		return Response(serializer.data, status=status.HTTP_201_CREATED)
	else:
		return Response(serializer.errors)




@extend_schema(request=VendorSerializer, responses=VendorSerializer)
@api_view(['PUT'])
@permission_classes([IsAuthenticated])
# @has_permissions([PermissionEnum.PERMISSION_UPDATE.name, PermissionEnum.PERMISSION_PARTIAL_UPDATE.name])
def updateVendor(request,pk):
	data = request.data
	print('vendor data: ', data)
	print('content_type: ', request.content_type)
	filtered_data = {}
	for key, value in data.items():
		if value != '' and value != '0':
			filtered_data[key] = value

	print('filtered_data: ', filtered_data)

	image = filtered_data.get('image', None)
	
	try:
		vendor = Vendor.objects.get(pk=int(pk))
	except ObjectDoesNotExist:
		return Response({'detail': f"Customer id - {pk} doesn't exists"})

	if type(image) == str and image is not None:
		poped_image = filtered_data.pop('image')
		serializer = VendorSerializer(vendor, data=filtered_data)
		if serializer.is_valid():
			serializer.save()
			return Response(serializer.data, status=status.HTTP_200_OK)
		else:
			return Response(serializer.errors)
	else:
		serializer = VendorSerializer(vendor, data=filtered_data)
		if serializer.is_valid():
			serializer.save()
			return Response(serializer.data, status=status.HTTP_200_OK)
		else:
			return Response(serializer.errors)




@extend_schema(request=VendorSerializer, responses=VendorSerializer)
@api_view(['DELETE'])
@permission_classes([IsAuthenticated])
# @has_permissions([PermissionEnum.PERMISSION_DELETE.name])
def deleteVendor(request, pk):
	try:
		vendor = Vendor.objects.get(pk=pk)
		vendor.delete()
		return Response({'detail': f'Vendor id - {pk} is deleted successfully'}, status=status.HTTP_200_OK)
	except ObjectDoesNotExist:
		return Response({'detail': f"Vendor id - {pk} doesn't exists"}, status=status.HTTP_400_BAD_REQUEST)


