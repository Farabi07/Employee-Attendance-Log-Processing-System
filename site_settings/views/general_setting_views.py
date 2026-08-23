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

from site_settings.models import GeneralSetting
from site_settings.serializers import GeneralSettingSerializer, GeneralSettingListSerializer

from commons.pagination import Pagination
from commons.enums import PermissionEnum

import datetime




# Create your views here.

@extend_schema(
	parameters=[
		OpenApiParameter("page"),
		OpenApiParameter("size"),
  ],
	request=GeneralSettingListSerializer,
	responses=GeneralSettingListSerializer
)
@api_view(['GET'])
# @permission_classes([IsAuthenticated])
# @has_permissions([PermissionEnum.ATTRIBUTE_LIST.name])
def getAllGeneralSetting(request):
	general_settings = GeneralSetting.objects.all()
	total_elements = general_settings.count()

	page = request.query_params.get('page')
	size = request.query_params.get('size')

	# Pagination
	pagination = Pagination()
	pagination.page = page
	pagination.size = size
	general_settings = pagination.paginate_data(general_settings)

	serializer = GeneralSettingListSerializer(general_settings, many=True)

	response = {
		'general_settings': serializer.data,
		'page': pagination.page,
		'size': pagination.size,
		'total_pages': pagination.total_pages,
		'total_elements': total_elements,
	}

	return Response(response, status=status.HTTP_200_OK)




@extend_schema(request=GeneralSettingSerializer, responses=GeneralSettingSerializer)
@api_view(['GET'])
# @permission_classes([IsAuthenticated])
# @has_permissions([PermissionEnum.ATTRIBUTE_DETAILS.name])
def getAGeneralSetting(request, pk):
	try:
		general_setting = GeneralSetting.objects.get(pk=pk)
		serializer = GeneralSettingSerializer(general_setting)
		return Response(serializer.data, status=status.HTTP_200_OK)
	except ObjectDoesNotExist:
		return Response({'detail': f"GeneralSetting id - {pk} does't exists"}, status=status.HTTP_400_BAD_REQUEST)




@extend_schema(request=GeneralSettingSerializer, responses=GeneralSettingSerializer)
@api_view(['POST'])
@permission_classes([IsAuthenticated])
# @has_permissions([PermissionEnum.ATTRIBUTE_CREATE.name])
def createGeneralSetting(request):
	data = request.data
	print('data: ', data)
	print('content_type: ', request.content_type)
	restricted_values = (0, '', ' ', 'undefined')

	filtered_data = {}

	for key, value in data.items():
		if value not in restricted_values:
			filtered_data[key] = value

	print('filtered_data: ', filtered_data)
			
	serializer = GeneralSettingSerializer(data=filtered_data)

	if serializer.is_valid():
		serializer.save()
		return Response(serializer.data, status=status.HTTP_200_OK)
	else:
		return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)




@extend_schema(request=GeneralSettingSerializer, responses=GeneralSettingSerializer)
@api_view(['PUT'])
@permission_classes([IsAuthenticated])
# @has_permissions([PermissionEnum.ATTRIBUTE_UPDATE.name])
def updateGeneralSetting(request, pk):
	data = request.data
	filtered_data = {}
	restricted_values = (0, '', ' ', 'undefined')

	print('data :', data)

	try:
		general_setting_obj = GeneralSetting.objects.get(pk=pk)
	except ObjectDoesNotExist:
		return Response({'detail': f"Product id - {pk} doesn't exists"})

	for key, value in data.items():
		if value not in restricted_values:
			filtered_data[key] = value

	print('filtered_data: ', filtered_data)
		
	logo = filtered_data.get('logo', None)
	favicon = filtered_data.get('favicon', None)
	footer_logo = filtered_data.get('footer_logo', None)

	if logo is not None and type(logo) == str:
		filtered_data.pop('logo')
	if favicon is not None and type(favicon) == str:
		filtered_data.pop('favicon')
	if footer_logo is not None and type(footer_logo) == str:
		filtered_data.pop('footer_logo')

	serializer = GeneralSettingSerializer(general_setting_obj, data=filtered_data)
	if serializer.is_valid():
		serializer.save()
		return Response(serializer.data, status=status.HTTP_200_OK)
	else:
		return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)




@extend_schema(request=GeneralSettingSerializer, responses=GeneralSettingSerializer)
@api_view(['DELETE'])
@permission_classes([IsAuthenticated])
# @has_permissions([PermissionEnum.ATTRIBUTE_DELETE.name])
def deleteGeneralSetting(request, pk):
	try:
		general_setting = GeneralSetting.objects.get(pk=pk)
		general_setting.delete()
		return Response({'detail': f'GeneralSetting id - {pk} is deleted successfully'}, status=status.HTTP_200_OK)
	except ObjectDoesNotExist:
		return Response({'detail': f"GeneralSetting id - {pk} does't exists"}, status=status.HTTP_400_BAD_REQUEST)


