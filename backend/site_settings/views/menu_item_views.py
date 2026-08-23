from django.core.exceptions import ObjectDoesNotExist
from django.db.models.fields.related import ManyToManyField

from rest_framework import status
from rest_framework.decorators import api_view, permission_classes, parser_classes
from rest_framework.parsers import JSONParser, MultiPartParser, FormParser
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response

from drf_spectacular.utils import  extend_schema, OpenApiParameter

from authentication.decorators import has_permissions
from authentication.models import Role
from site_settings.filters import MenuItemFilter

from site_settings.models import MenuItem, RoleMenu
from site_settings.serializers import MenuItemSerializer, MenuItemListSerializer, MenuItemNestedSerializer

from commons.pagination import Pagination
from commons.enums import PermissionEnum




# Create your views here.


@extend_schema(
	parameters=[
		OpenApiParameter("page"),
		OpenApiParameter("size"),
  ],
	request=MenuItemListSerializer,
	responses=MenuItemListSerializer
)
@api_view(['GET'])
# @permission_classes([IsAuthenticated])
# @has_permissions([PermissionEnum.ATTRIBUTE_LIST.name])
def getAllMenuItem(request):
	menu_items = MenuItem.objects.all()
	total_elements = menu_items.count()

	page = request.query_params.get('page')
	size = request.query_params.get('size')

	# Pagination
	pagination = Pagination()
	pagination.page = page
	pagination.size = size
	menu_items = pagination.paginate_data(menu_items)

	serializer = MenuItemListSerializer(menu_items, many=True)

	response = {
		'menu_items': serializer.data,
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
	request=MenuItemListSerializer,
	responses=MenuItemListSerializer
)
@api_view(['GET'])
# @permission_classes([IsAuthenticated])
# @has_permissions([PermissionEnum.ATTRIBUTE_LIST.name])
def getAllMenuItemWithoutPagination(request):
	menu_items = MenuItem.objects.all()

	serializer = MenuItemListSerializer(menu_items, many=True)

	response = {
		'menu_items': serializer.data,
	}

	return Response(response, status=status.HTTP_200_OK)




@extend_schema(
	parameters=[
		OpenApiParameter("page"),
		OpenApiParameter("size"),
  ],
	request=MenuItemListSerializer,
	responses=MenuItemListSerializer
)
@api_view(['GET'])
# @permission_classes([IsAuthenticated])
# @has_permissions([PermissionEnum.ATTRIBUTE_LIST.name])
def getAllNestedMenuItemWithoutPagination(request):
	menu_items = MenuItem.objects.filter(parent__isnull=True)

	serializer = MenuItemNestedSerializer(menu_items, many=True)

	response = {
		'menu_items': serializer.data,
	}

	return Response(response, status=status.HTTP_200_OK)




@extend_schema(
	parameters=[
		OpenApiParameter("page"),
		OpenApiParameter("size"),
  ],
	request=MenuItemListSerializer,
	responses=MenuItemListSerializer
)
@api_view(['GET'])
@permission_classes([IsAuthenticated])
# @has_permissions([PermissionEnum.ATTRIBUTE_LIST.name])
def getAllNestedMenuItemByUserRole(request):
	user = request.user
	role = user.role

	print('user: ', user)
	print('role: ', role)

	role_menu_objs = RoleMenu.objects.filter(role=role)

	menu_item_ids = [role_menu.menu_item.id  for role_menu in role_menu_objs]

	print('menu_item_ids: ', menu_item_ids)

	menu_items = MenuItem.objects.filter(pk__in=menu_item_ids)

	_map = []
	response_arr = []

	for menu_item in menu_items:
		if menu_item.parent is None and menu_item.id not in _map:
			menu_item_serializer = MenuItemListSerializer(menu_item)
			menu_item_data = menu_item_serializer.data
			menu_item_data['children'] = []
			response_arr.append(menu_item_data)
			_map.append(menu_item.id)
			print('menu item data: ', menu_item_data)
		elif menu_item.parent is not None:
			parent = menu_item.parent
			print('parent: ', parent)
			print('type of parent: ', type(parent))
			if parent.id not in _map:
				menu_item_serializer = MenuItemListSerializer(parent)
				menu_item_data = menu_item_serializer.data
				menu_item_data['children'] = []
				print('menu_item_data: ', menu_item_data)
				response_arr.append(menu_item_data)
				_map.append(parent.id)
				print('menu item data: ', menu_item_data)
			for item in response_arr:
				print('item: ', item)
				if parent.id == item['id']:
					menu_item_serializer = MenuItemListSerializer(menu_item)
					menu_item_data = menu_item_serializer.data
					item['children'].append(menu_item_data)
		print(menu_item)
		print('type of menu_item: ', type(menu_item))
	
	print('response_arr: ', response_arr)

	response = {
		'menu_items': response_arr
	}

	return Response(response, status=status.HTTP_200_OK)




@extend_schema(
	parameters=[
		OpenApiParameter("page"),
		OpenApiParameter("size"),
  ],
	request=MenuItemListSerializer,
	responses=MenuItemListSerializer
)
@api_view(['GET'])
@permission_classes([IsAuthenticated])
# @has_permissions([PermissionEnum.ATTRIBUTE_LIST.name])
def getAllNestedMenuItemByRoleId(request, role_id):
	try:
		role_obj = Role.objects.get(pk=role_id)
	except Role.DoesNotExist:
		return Response({'detail': f"Role id {role_id} doesn't exists"})
	print('role_obj: ', role_obj)

	role_menu_objs = RoleMenu.objects.filter(role=role_obj)

	menu_item_ids = [role_menu.menu_item.id  for role_menu in role_menu_objs]

	print('menu_item_ids: ', menu_item_ids)

	menu_items = MenuItem.objects.filter(pk__in=menu_item_ids)

	_map = []
	response_arr = []

	for menu_item in menu_items:
		if menu_item.parent is None and menu_item.id not in _map:
			menu_item_serializer = MenuItemListSerializer(menu_item)
			menu_item_data = menu_item_serializer.data
			menu_item_data['children'] = []
			response_arr.append(menu_item_data)
			_map.append(menu_item.id)
			print('menu item data: ', menu_item_data)
		elif menu_item.parent is not None:
			parent = menu_item.parent
			print('parent: ', parent)
			print('type of parent: ', type(parent))
			if parent.id not in _map:
				menu_item_serializer = MenuItemListSerializer(parent)
				menu_item_data = menu_item_serializer.data
				menu_item_data['children'] = []
				print('menu_item_data: ', menu_item_data)
				response_arr.append(menu_item_data)
				_map.append(parent.id)
				print('menu item data: ', menu_item_data)
			for item in response_arr:
				print('item: ', item)
				if parent.id == item['id']:
					menu_item_serializer = MenuItemListSerializer(menu_item)
					menu_item_data = menu_item_serializer.data
					item['children'].append(menu_item_data)
		print(menu_item)
		print('type of menu_item: ', type(menu_item))
	
	print('response_arr: ', response_arr)

	response = {
		'menu_items': response_arr
	}
	return Response(response, status=status.HTTP_200_OK)




@extend_schema(request=MenuItemSerializer, responses=MenuItemSerializer)
@api_view(['GET'])
# @permission_classes([IsAuthenticated])
# @has_permissions([PermissionEnum.ATTRIBUTE_DETAILS.name])
def getAMenuItem(request, pk):
	try:
		menu_item = MenuItem.objects.get(pk=pk)
		serializer = MenuItemSerializer(menu_item)
		return Response(serializer.data, status=status.HTTP_200_OK)
	except ObjectDoesNotExist:
		return Response({'detail': f"MenuItem id - {pk} does't exists"}, status=status.HTTP_400_BAD_REQUEST)




@extend_schema(request=MenuItemSerializer, responses=MenuItemSerializer)
@api_view(['GET'])
# @permission_classes([IsAuthenticated])
# @has_permissions([PermissionEnum.PERMISSION_DETAILS_VIEW.name])
def searchMenuItem(request):
	branches = MenuItemFilter(request.GET, queryset=MenuItem.objects.all())
	branches = branches.qs

	print('searched_products: ', branches)

	total_elements = branches.count()

	page = request.query_params.get('page')
	size = request.query_params.get('size')

	# Pagination
	pagination = Pagination()
	pagination.page = page
	pagination.size = size
	branches = pagination.paginate_data(branches)

	serializer = MenuItemListSerializer(branches, many=True)

	response = {
		'branches': serializer.data,
		'page': pagination.page,
		'size': pagination.size,
		'total_pages': pagination.total_pages,
		'total_elements': total_elements,
	}

	if len(branches) > 0:
		return Response(response, status=status.HTTP_200_OK)
	else:
		return Response({'detail': f"There are no branches matching your search"}, status=status.HTTP_400_BAD_REQUEST)




@extend_schema(request=MenuItemSerializer, responses=MenuItemSerializer)
@api_view(['POST'])
@permission_classes([IsAuthenticated])
# @has_permissions([PermissionEnum.ATTRIBUTE_CREATE.name])
def createMenuItem(request):
	data = request.data
	print('data: ', data)
	print('content_type: ', request.content_type)

	filtered_data = {}

	for key, value in data.items():
		if value != '' and value != '0':
			filtered_data[key] = value
	
	print('filtered_data: ', filtered_data)
	
	serializer = MenuItemSerializer(data=filtered_data)

	if serializer.is_valid():
		serializer.save()
		return Response(serializer.data)
	else:
		return Response(serializer.errors)




@extend_schema(request=MenuItemSerializer, responses=MenuItemSerializer)
@api_view(['PUT'])
@permission_classes([IsAuthenticated])
# @has_permissions([PermissionEnum.ATTRIBUTE_UPDATE.name])
def updateMenuItem(request, pk):
	data = request.data
	filtered_data = {}

	try:
		menu_item_obj = MenuItem.objects.get(pk=pk)
	except ObjectDoesNotExist:
		return Response({'detail': f"MenuItem id - {pk} doesn't exists"})

	for key, value in data.items():
		if value != '' and value != '0':
			filtered_data[key] = value

	print('filtered_data: ', filtered_data)
	
	serializer = MenuItemSerializer(menu_item_obj, data=filtered_data)
	if serializer.is_valid():
		serializer.save()
		return Response(serializer.data, status=status.HTTP_200_OK)
	else:
		return Response(serializer.errors)
	




@extend_schema(request=MenuItemSerializer, responses=MenuItemSerializer)
@api_view(['DELETE'])
@permission_classes([IsAuthenticated])
# @has_permissions([PermissionEnum.ATTRIBUTE_DELETE.name])
def deleteMenuItem(request, pk):
	try:
		menu_item = MenuItem.objects.get(pk=pk)
		menu_item.delete()
		return Response({'detail': f'MenuItem id - {pk} is deleted successfully'}, status=status.HTTP_200_OK)
	except ObjectDoesNotExist:
		return Response({'detail': f"MenuItem id - {pk} does't exists"}, status=status.HTTP_400_BAD_REQUEST)


