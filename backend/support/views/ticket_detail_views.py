import re
from django.core.exceptions import ObjectDoesNotExist
from django.db.models.fields.related import ManyToManyField

from rest_framework import status
from rest_framework.decorators import api_view, permission_classes, parser_classes
from rest_framework.parsers import JSONParser, MultiPartParser, FormParser
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response

from drf_spectacular.utils import  extend_schema, OpenApiParameter

from authentication.decorators import has_permissions

from support.models import TicketDetail, Ticket
from support.serializers import TicketDetailSerializer, TicketDetailListSerializer

from commons.pagination import Pagination
from commons.enums import PermissionEnum

import datetime




# Create your views here.

@extend_schema(
	parameters=[
		OpenApiParameter("page"),
		OpenApiParameter("size"),
  ],
	request=TicketDetailListSerializer,
	responses=TicketDetailListSerializer
)
@api_view(['GET'])
# @permission_classes([IsAuthenticated])
# @has_permissions([PermissionEnum.ATTRIBUTE_LIST.name])
def getAllTicketDetail(request):
	ticket_details = TicketDetail.objects.all()
	total_elements = ticket_details.count()

	page = request.query_params.get('page')
	size = request.query_params.get('size')

	# Pagination
	pagination = Pagination()
	pagination.page = page
	pagination.size = size
	ticket_details = pagination.paginate_data(ticket_details)

	serializer = TicketDetailListSerializer(ticket_details, many=True)

	response = {
		'ticket_details': serializer.data,
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
	request=TicketDetailListSerializer,
	responses=TicketDetailListSerializer
)
@api_view(['GET'])
# @permission_classes([IsAuthenticated])
# @has_permissions([PermissionEnum.ATTRIBUTE_LIST.name])
def getAllTicketDetailByTicketId(request, ticket_id):
	try:
		ticket_obj = Ticket.objects.get(pk=ticket_id)
	except Ticket.DoesNotExist:
		return Response({'detail': f"Ticket id {ticket_id} doesn't exists."})

	ticket_details = TicketDetail.objects.filter(ticket=ticket_obj)
	total_elements = ticket_details.count()

	page = request.query_params.get('page')
	size = request.query_params.get('size')

	# Pagination
	pagination = Pagination()
	pagination.page = page
	pagination.size = size
	ticket_details = pagination.paginate_data(ticket_details)

	serializer = TicketDetailListSerializer(ticket_details, many=True)

	response = {
		'ticket_details': serializer.data,
		'page': pagination.page,
		'size': pagination.size,
		'total_pages': pagination.total_pages,
		'total_elements': total_elements,
	}

	return Response(response, status=status.HTTP_200_OK)




@extend_schema(request=TicketDetailSerializer, responses=TicketDetailSerializer)
@api_view(['GET'])
# @permission_classes([IsAuthenticated])
# @has_permissions([PermissionEnum.ATTRIBUTE_DETAILS.name])
def getATicketDetail(request, pk):
	try:
		ticket_detail = TicketDetail.objects.get(pk=pk)
		serializer = TicketDetailSerializer(ticket_detail)
		return Response(serializer.data, status=status.HTTP_200_OK)
	except ObjectDoesNotExist:
		return Response({'detail': f"TicketDetail id - {pk} does't exists"}, status=status.HTTP_400_BAD_REQUEST)




@extend_schema(request=TicketDetailSerializer, responses=TicketDetailSerializer)
@api_view(['POST'])
@permission_classes([IsAuthenticated])
# @has_permissions([PermissionEnum.ATTRIBUTE_CREATE.name])
def createTicketDetail(request):
	data = request.data
	print('data: ', data)
	print('content_type: ', request.content_type)
	
	filtered_data = {}

	for key, value in data.items():
		if value != '' and value != 0 and value != '0':
			filtered_data[key] = value

	print('filtered_data: ', filtered_data)
			
	serializer = TicketDetailSerializer(data=filtered_data)

	if serializer.is_valid():
		serializer.save()
		return Response(serializer.data)
	else:
		return Response(serializer.errors)




@extend_schema(request=TicketDetailSerializer, responses=TicketDetailSerializer)
@api_view(['PUT'])
@permission_classes([IsAuthenticated])
@has_permissions([PermissionEnum.ATTRIBUTE_UPDATE.name])
# @parser_classes([MultiPartParser, FormParser])
def updateTicketDetail(request, pk):
	data = request.data
	print('data :', data)
	filtered_data = {}

	try:
		ticket_detail_obj = TicketDetail.objects.get(pk=pk)
	except ObjectDoesNotExist:
		return Response({'detail': f"Product id - {pk} doesn't exists"})

	for key, value in data.items():
		if value != '' and value != '0':
			filtered_data[key] = value

	print('filtered_data: ', filtered_data)
		
	logo = filtered_data.get('logo', None)
	favicon = filtered_data.get('favicon', None)

	if logo is not None and type(logo) == str:
		popped_logo = filtered_data.pop('logo')
	if favicon is not None and type(favicon) == str:
		popped_favicon = filtered_data.pop('favicon')

	serializer = TicketDetailSerializer(ticket_detail_obj, data=filtered_data)
	if serializer.is_valid():
		serializer.save()
		return Response(serializer.data, status=status.HTTP_200_OK)
	else:
		return Response(serializer.errors)




@extend_schema(request=TicketDetailSerializer, responses=TicketDetailSerializer)
@api_view(['DELETE'])
@permission_classes([IsAuthenticated])
@has_permissions([PermissionEnum.ATTRIBUTE_DELETE.name])
def deleteTicketDetail(request, pk):
	try:
		ticket_detail = TicketDetail.objects.get(pk=pk)
		ticket_detail.delete()
		return Response({'detail': f'TicketDetail id - {pk} is deleted successfully'}, status=status.HTTP_200_OK)
	except ObjectDoesNotExist:
		return Response({'detail': f"TicketDetail id - {pk} does't exists"}, status=status.HTTP_400_BAD_REQUEST)


