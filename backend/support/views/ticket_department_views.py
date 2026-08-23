from django.core.exceptions import ObjectDoesNotExist

from rest_framework import status
from rest_framework.decorators import api_view, permission_classes, parser_classes
from rest_framework.parsers import JSONParser, MultiPartParser, FormParser
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response

from drf_spectacular.utils import  extend_schema, OpenApiParameter

from authentication.decorators import has_permissions

from support.models import TicketDepartment
from support.serializers import TicketDepartmentSerializer, TicketDepartmentListSerializer

from commons.pagination import Pagination
from commons.enums import PermissionEnum

import datetime




# Create your views here.

@extend_schema(
	parameters=[
		OpenApiParameter("page"),
		OpenApiParameter("size"),
  ],
	request=TicketDepartmentListSerializer,
	responses=TicketDepartmentListSerializer
)
@api_view(['GET'])
# @permission_classes([IsAuthenticated])
# @has_permissions([PermissionEnum.ATTRIBUTE_LIST.name])
def getAllTicketDepartment(request):
	ticket_departments = TicketDepartment.objects.all()
	total_elements = ticket_departments.count()

	page = request.query_params.get('page')
	size = request.query_params.get('size')

	# Pagination
	pagination = Pagination()
	pagination.page = page
	pagination.size = size
	ticket_departments = pagination.paginate_data(ticket_departments)

	serializer = TicketDepartmentListSerializer(ticket_departments, many=True)

	response = {
		'ticket_departments': serializer.data,
		'page': pagination.page,
		'size': pagination.size,
		'total_pages': pagination.total_pages,
		'total_elements': total_elements,
	}

	return Response(response, status=status.HTTP_200_OK)




@extend_schema(request=TicketDepartmentSerializer, responses=TicketDepartmentSerializer)
@api_view(['GET'])
# @permission_classes([IsAuthenticated])
# @has_permissions([PermissionEnum.ATTRIBUTE_DETAILS.name])
def getATicketDepartment(request, pk):
	try:
		ticket_department = TicketDepartment.objects.get(pk=pk)
		serializer = TicketDepartmentSerializer(ticket_department)
		return Response(serializer.data, status=status.HTTP_200_OK)
	except ObjectDoesNotExist:
		return Response({'detail': f"TicketDepartment id - {pk} does't exists"}, status=status.HTTP_400_BAD_REQUEST)




@extend_schema(request=TicketDepartmentSerializer, responses=TicketDepartmentSerializer)
@api_view(['POST'])
@permission_classes([IsAuthenticated])
# @has_permissions([PermissionEnum.ATTRIBUTE_CREATE.name])
def createTicketDepartment(request):
	data = request.data
	print('data: ', data)
	print('content_type: ', request.content_type)

	filtered_data = {}

	for key, value in data.items():
		if value != '' and value != '0':
			filtered_data[key] = value
	
	print('filtered_data: ', filtered_data)
	
	serializer = TicketDepartmentSerializer(data=filtered_data)

	if serializer.is_valid():
		serializer.save()
		return Response(serializer.data)
	else:
		return Response(serializer.errors)




@extend_schema(request=TicketDepartmentSerializer, responses=TicketDepartmentSerializer)
@api_view(['PUT'])
@permission_classes([IsAuthenticated])
# @has_permissions([PermissionEnum.ATTRIBUTE_UPDATE.name])
def updateTicketDepartment(request, pk):
	data = request.data
	filtered_data = {}

	try:
		ticket_obj = TicketDepartment.objects.get(pk=pk)
	except ObjectDoesNotExist:
		return Response({'detail': f"TicketDepartment id - {pk} doesn't exists"})

	for key, value in data.items():
		if value != '' and value != '0':
			filtered_data[key] = value

	print('filtered_data: ', filtered_data)

	image = data.get('image', None)

	if image is not None and type(image) == str:
		popped_image = filtered_data.pop('image')
	
	serializer = TicketDepartmentSerializer(ticket_obj, data=filtered_data)
	if serializer.is_valid():
		serializer.save()
		return Response(serializer.data, status=status.HTTP_200_OK)
	else:
		return Response(serializer.errors)
	




@extend_schema(request=TicketDepartmentSerializer, responses=TicketDepartmentSerializer)
@api_view(['DELETE'])
@permission_classes([IsAuthenticated])
# @has_permissions([PermissionEnum.ATTRIBUTE_DELETE.name])
def deleteTicketDepartment(request, pk):
	try:
		ticket_department = TicketDepartment.objects.get(pk=pk)
		ticket_department.delete()
		return Response({'detail': f'TicketDepartment id - {pk} is deleted successfully'}, status=status.HTTP_200_OK)
	except ObjectDoesNotExist:
		return Response({'detail': f"TicketDepartment id - {pk} does't exists"}, status=status.HTTP_400_BAD_REQUEST)


