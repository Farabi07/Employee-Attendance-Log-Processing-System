from email.contentmanager import ContentManager
from django.core.exceptions import ObjectDoesNotExist
from django.db import connection, connections

from authentication.serializers import AdminUserMinimalListSerializer
from authentication.views.user_views import User

from rest_framework import status
from rest_framework.decorators import api_view, permission_classes, parser_classes
from rest_framework.parsers import JSONParser, MultiPartParser, FormParser
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response

from drf_spectacular.utils import  extend_schema, OpenApiParameter

from authentication.decorators import has_permissions

from cms.models import CMSMenu, CMSMenuContent
from cms.serializers import CMSMenuNestedSerializer, CMSMenuSerializer, CMSMenuListSerializer, CMSMenuMinimalSerializer

from utils.login_logout import get_all_logged_in_users

from commons.pagination import Pagination
from commons.enums import PermissionEnum

import datetime




# Create your views here.

@extend_schema(
	parameters=[
		OpenApiParameter("page"),
		OpenApiParameter("size"),
  ],
	request=CMSMenuSerializer,
	responses=CMSMenuListSerializer
)
@api_view(['GET'])
# @permission_classes([IsAuthenticated])
# @has_permissions([PermissionEnum.ATTRIBUTE_LIST.name])
def getAllCMSMenu(request):
	menus = CMSMenu.objects.all()
	print('menus: ', menus)

	total_elements = menus.count()

	page = request.query_params.get('page')
	size = request.query_params.get('size')

	# Pagination
	pagination = Pagination()
	pagination.page = page
	pagination.size = size
	menus = pagination.paginate_data(menus)

	serializer = CMSMenuListSerializer(menus, many=True)

	response = {
		'menus': serializer.data,
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
	request=CMSMenuSerializer,
	responses=CMSMenuListSerializer
)
@api_view(['GET'])
# @permission_classes([IsAuthenticated])
# @has_permissions([PermissionEnum.ATTRIBUTE_LIST.name])
def getAllCMSMenuWithoutPagination(request):
	menus = CMSMenu.objects.all()
	print('menus: ', menus)

	serializer = CMSMenuMinimalSerializer(menus, many=True)

	response = {
		'menus': serializer.data,
	}

	return Response(response, status=status.HTTP_200_OK)




@extend_schema(
	parameters=[
		OpenApiParameter("page"),
		OpenApiParameter("size"),
  ],
	request=CMSMenuSerializer,
	responses=CMSMenuListSerializer
)
@api_view(['GET'])
# @permission_classes([IsAuthenticated])
# @has_permissions([PermissionEnum.ATTRIBUTE_LIST.name])
def getAllNestedCMSMenu(request):
	response_list = list()

	menus = CMSMenu.objects.filter(parent__isnull=True).order_by('position')
	print('menus: ', menus)

	serializer = CMSMenuNestedSerializer(menus, many=True)

	response = {
		'menus': serializer.data,
	}

	return Response(response, status=status.HTTP_200_OK)




@extend_schema(
	parameters=[
		OpenApiParameter("page"),
		OpenApiParameter("size"),
  ],
	request=CMSMenuListSerializer,
	responses=CMSMenuListSerializer
)
@api_view(['GET'])
# @permission_classes([IsAuthenticated])
# @has_permissions([PermissionEnum.ATTRIBUTE_LIST.name])
def getAllCMSMenuContentAndImageByMenuId(request, menu_id):
	# menu_items = CMSMenuContent.objects.filter(cms_menu=cms_menu_id)
	with connection.cursor() as cursor:
		cursor.execute('''
						select 
							cms_menu_id AS cms_menu,
							json_object_agg(name, value) AS data
							from cms_cmsmenucontent where cms_menu_id=%s
							group by cms_menu_id
							order by cms_menu_id;
						''', [menu_id])
		content_row = cursor.fetchone()
		print('content_row: ', content_row)
		print('content_row type: ', type(content_row))

	menu_contents = []
	if type(content_row) == tuple:
		menu_contents = content_row[1]

	with connection.cursor() as cursor:
		cursor.execute('''
			select
			json_object_agg(
				head,
				case
				when array_length(image,1)=1 then to_json(image[1])
				else to_json(image)
				end)
			from (
			select head, array_agg(image) as image
			from cms_cmsmenucontentimage where cms_menu_id=%s
			group by head) as x;
						''', [menu_id])
		image_row = cursor.fetchall()
		print('image_row: ', image_row)
		print('image_row type: ', type(image_row))

	content_images = []
	if type(image_row) == tuple:
		content_images = image_row[0]


	response = {
	'menu_contents': menu_contents,
	'content_images': content_images,

	}

	return Response(response, status=status.HTTP_200_OK)




@extend_schema(request=CMSMenuSerializer, responses=CMSMenuSerializer)
@api_view(['GET'])
# @permission_classes([IsAuthenticated])
# @has_permissions([PermissionEnum.ATTRIBUTE_DETAILS.name])
def getACMSMenu(request, pk):
	try:
		menu = CMSMenu.objects.get(pk=pk)
		serializer = CMSMenuSerializer(menu)
		return Response(serializer.data, status=status.HTTP_200_OK)
	except ObjectDoesNotExist:
		return Response({'detail': f"CMSMenu id - {pk} does't exists"}, status=status.HTTP_400_BAD_REQUEST)




@extend_schema(request=CMSMenuSerializer, responses=CMSMenuSerializer)
@api_view(['POST'])
# @permission_classes([IsAuthenticated])
# @has_permissions([PermissionEnum.ATTRIBUTE_CREATE.name])
def createCMSMenu(request):
	data = request.data
	sender_id = request.user.id
	print('data: ', data)
	print('content_type: ', request.content_type)
	
	filtered_data = {}

	for key, value in data.items():
		if value != '' and value != 0 and value != '0':
			filtered_data[key] = value

	filtered_data['sender'] = sender_id

	print('filtered_data: ', filtered_data)

	serializer = CMSMenuSerializer(data=filtered_data)

	if serializer.is_valid():
		serializer.save()
		return Response(serializer.data)
	else:
		return Response(serializer.errors)




@extend_schema(request=CMSMenuSerializer, responses=CMSMenuSerializer)
@api_view(['PUT'])
# @permission_classes([IsAuthenticated])
# @has_permissions([PermissionEnum.ATTRIBUTE_UPDATE.name])
def updateCMSMenu(request, pk):
	data = request.data
	print('data :', data)
	filtered_data = {}

	try:
		menu_obj = CMSMenu.objects.get(pk=pk)
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

	serializer = CMSMenuSerializer(menu_obj, data=filtered_data)
	if serializer.is_valid():
		serializer.save()
		return Response(serializer.data, status=status.HTTP_200_OK)
	else:
		return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)




@extend_schema(request=CMSMenuSerializer, responses=CMSMenuSerializer)
@api_view(['DELETE'])
# @permission_classes([IsAuthenticated])
# @has_permissions([PermissionEnum.ATTRIBUTE_DELETE.name])
def deleteCMSMenu(request, pk):
	try:
		menu = CMSMenu.objects.get(pk=pk)
		menu.delete()
		return Response({'detail': f'CMSMenu id - {pk} is deleted successfully'}, status=status.HTTP_200_OK)
	except ObjectDoesNotExist:
		return Response({'detail': f"CMSMenu id - {pk} does't exists"}, status=status.HTTP_400_BAD_REQUEST)


