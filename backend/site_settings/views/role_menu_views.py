from django.core.exceptions import ObjectDoesNotExist
from django.db.models.fields.related import ManyToManyField

from rest_framework import status
from rest_framework.decorators import api_view, permission_classes, parser_classes
from rest_framework.parsers import JSONParser, MultiPartParser, FormParser
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response

from drf_spectacular.utils import  extend_schema, OpenApiParameter

from authentication.decorators import has_permissions
from authentication.serializers import RoleSerializer

from site_settings.models import MenuItem, Role, RoleMenu
from site_settings.serializers import RoleMenuSerializer, RoleMenuListSerializer

from commons.pagination import Pagination
from commons.enums import PermissionEnum

import datetime




# Create your views here.

@extend_schema(
	parameters=[
		OpenApiParameter("page"),
		OpenApiParameter("size"),
  ],
	request=RoleMenuListSerializer,
	responses=RoleMenuListSerializer
)
@api_view(['GET'])
# @permission_classes([IsAuthenticated])
# @has_permissions([PermissionEnum.ATTRIBUTE_LIST.name])
def getAllRoleMenu(request):
	role_menus = RoleMenu.objects.order_by('role__name').distinct('role__name')
	total_elements = role_menus.count()

	page = request.query_params.get('page')
	size = request.query_params.get('size')

	# Pagination
	pagination = Pagination()
	pagination.page = page
	pagination.size = size
	role_menus = pagination.paginate_data(role_menus)

	serializer = RoleMenuListSerializer(role_menus, many=True)

	response = {
		'role_menus': serializer.data,
		'page': pagination.page,
		'size': pagination.size,
		'total_pages': pagination.total_pages,
		'total_elements': total_elements,
	}

	return Response(response, status=status.HTTP_200_OK)




@extend_schema(request=RoleMenuSerializer, responses=RoleMenuSerializer)
@api_view(['GET'])
# @permission_classes([IsAuthenticated])
# @has_permissions([PermissionEnum.ATTRIBUTE_DETAILS.name])
def getARoleMenu(request, pk):
	try:
		role_menu = RoleMenu.objects.get(pk=pk)
		serializer = RoleMenuSerializer(role_menu)
		return Response(serializer.data, status=status.HTTP_200_OK)
	except ObjectDoesNotExist:
		return Response({'detail': f"RoleMenu id - {pk} does't exists"}, status=status.HTTP_400_BAD_REQUEST)




@extend_schema(request=RoleMenuSerializer, responses=RoleMenuSerializer)
@api_view(['POST'])
@permission_classes([IsAuthenticated])
# @has_permissions([PermissionEnum.ATTRIBUTE_CREATE.name])
def createRoleMenu(request):
	data = request.data
	role = data.get('role', None)
	menu_items = data.get('menu_items', None)

	print('data: ', data)
	print('content_type: ', request.content_type)

	role_obj = Role.objects.get(pk=role)

	old_role_menu_objs = RoleMenu.objects.filter(role=role_obj)
	old_role_menu_objs.delete()

	for menu_item_id in menu_items:
		menu_item_obj = MenuItem.objects.get(pk=menu_item_id)

		role_menu_obj = RoleMenu.objects.create(role=role_obj, menu_item=menu_item_obj)

	role_menu_objs = RoleMenu.objects.filter(role=role)
	role_menu_serializer = RoleMenuListSerializer(role_menu_objs, many=True)

	return Response({'role_menus': role_menu_serializer.data, 'detail': f"RoleMenus for {role} created successfully"})




@extend_schema(request=RoleMenuSerializer, responses=RoleMenuSerializer)
@api_view(['PUT'])
@permission_classes([IsAuthenticated])
# @has_permissions([PermissionEnum.ATTRIBUTE_UPDATE.name])
def updateRoleMenu(request, pk):
	data = request.data
	filtered_data = {}

	try:
		role_menu_obj = RoleMenu.objects.get(pk=pk)
	except ObjectDoesNotExist:
		return Response({'detail': f"RoleMenu id - {pk} doesn't exists"})

	for key, value in data.items():
		if value != '' and value != '0':
			filtered_data[key] = value

	print('filtered_data: ', filtered_data)

	image = data.get('image', None)

	if image is not None and type(image) == str:
		popped_image = filtered_data.pop('image')
	
	serializer = RoleMenuSerializer(role_menu_obj, data=filtered_data)
	if serializer.is_valid():
		serializer.save()
		return Response(serializer.data, status=status.HTTP_200_OK)
	else:
		return Response(serializer.errors)




@extend_schema(request=RoleMenuSerializer, responses=RoleMenuSerializer)
@api_view(['DELETE'])
@permission_classes([IsAuthenticated])
# @has_permissions([PermissionEnum.ATTRIBUTE_DELETE.name])
def deleteRoleMenu(request, role_id):
	try:
		role_obj = Role.objects.get(pk=role_id)
	except ObjectDoesNotExist:
		return Response({'detail': f"RoleMenu id - {role_id} does't exists"}, status=status.HTTP_400_BAD_REQUEST)

	try:
		role_menu_objs = RoleMenu.objects.filter(role=role_obj)
		role_menu_objs.delete()
		return Response({'detail': f"RoleMenus for '{role_obj.name}' have been deleted successfully"}, status=status.HTTP_200_OK)
	except ObjectDoesNotExist:
		return Response({'detail': f"RoleMenus do not exists."}, status=status.HTTP_400_BAD_REQUEST)


