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

from site_settings.models import Contact
from site_settings.serializers import ContactSerializer, ContactListSerializer

from commons.pagination import Pagination
from commons.enums import PermissionEnum

import datetime




# Create your views here.

@extend_schema(
	parameters=[
		OpenApiParameter("page"),
		OpenApiParameter("size"),
  ],
	request=ContactListSerializer,
	responses=ContactListSerializer
)
@api_view(['GET'])
# @permission_classes([IsAuthenticated])
# @has_permissions([PermissionEnum.ATTRIBUTE_LIST.name])
def getAllContact(request):
	contacts = Contact.objects.all()
	total_elements = contacts.count()

	page = request.query_params.get('page')
	size = request.query_params.get('size')

	# Pagination
	pagination = Pagination()
	pagination.page = page
	pagination.size = size
	contacts = pagination.paginate_data(contacts)

	serializer = ContactListSerializer(contacts, many=True)

	response = {
		'contacts': serializer.data,
		'page': pagination.page,
		'size': pagination.size,
		'total_pages': pagination.total_pages,
		'total_elements': total_elements,
	}

	return Response(response, status=status.HTTP_200_OK)




@extend_schema(request=ContactSerializer, responses=ContactSerializer)
@api_view(['GET'])
# @permission_classes([IsAuthenticated])
# @has_permissions([PermissionEnum.ATTRIBUTE_DETAILS.name])
def getAContact(request, pk):
	try:
		contact = Contact.objects.get(pk=pk)
		serializer = ContactSerializer(contact)
		return Response(serializer.data, status=status.HTTP_200_OK)
	except ObjectDoesNotExist:
		return Response({'detail': f"Contact id - {pk} does't exists"}, status=status.HTTP_400_BAD_REQUEST)




@extend_schema(request=ContactSerializer, responses=ContactSerializer)
@api_view(['POST'])
@permission_classes([IsAuthenticated])
# @has_permissions([PermissionEnum.ATTRIBUTE_CREATE.name])
def createContact(request):
	data = request.data
	print('data: ', data)
	print('content_type: ', request.content_type)
	
	filtered_data = {}

	for key, value in data.items():
		if value != '' and value != '0':
			filtered_data[key] = value

	print('filtered_data: ', filtered_data)
			
	serializer = ContactSerializer(data=filtered_data)

	if serializer.is_valid():
		serializer.save()
		return Response(serializer.data)
	else:
		return Response(serializer.errors)




@extend_schema(request=ContactSerializer, responses=ContactSerializer)
@api_view(['PUT'])
@permission_classes([IsAuthenticated])
@has_permissions([PermissionEnum.ATTRIBUTE_UPDATE.name])
# @parser_classes([MultiPartParser, FormParser])
def updateContact(request, pk):
	data = request.data
	print('data :', data)
	filtered_data = {}

	try:
		general_setting_obj = Contact.objects.get(pk=pk)
	except ObjectDoesNotExist:
		return Response({'detail': f"Product id - {pk} doesn't exists"})

	for key, value in data.items():
		if value != '' and value != '0':
			filtered_data[key] = value

	print('filtered_data: ', filtered_data)
		
	serializer = ContactSerializer(general_setting_obj, data=filtered_data)
	if serializer.is_valid():
		serializer.save()
		return Response(serializer.data, status=status.HTTP_200_OK)
	else:
		return Response(serializer.errors)




@extend_schema(request=ContactSerializer, responses=ContactSerializer)
@api_view(['DELETE'])
@permission_classes([IsAuthenticated])
@has_permissions([PermissionEnum.ATTRIBUTE_DELETE.name])
def deleteContact(request, pk):
	try:
		contact = Contact.objects.get(pk=pk)
		contact.delete()
		return Response({'detail': f'Contact id - {pk} is deleted successfully'}, status=status.HTTP_200_OK)
	except ObjectDoesNotExist:
		return Response({'detail': f"Contact id - {pk} does't exists"}, status=status.HTTP_400_BAD_REQUEST)


