from django.core.exceptions import ObjectDoesNotExist

from rest_framework import status
from rest_framework.decorators import api_view, permission_classes, parser_classes
from rest_framework.parsers import JSONParser, MultiPartParser, FormParser
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response

from drf_spectacular.utils import  extend_schema, OpenApiParameter

from authentication.decorators import has_permissions

from support.models import TaskType
from support.serializers import TaskTypeSerializer, TaskTypeListSerializer

from commons.pagination import Pagination
from commons.enums import PermissionEnum

import datetime




# Create your views here.

@extend_schema(
	parameters=[
		OpenApiParameter("page"),
		OpenApiParameter("size"),
  ],
	request=TaskTypeListSerializer,
	responses=TaskTypeListSerializer
)
@api_view(['GET'])
# @permission_classes([IsAuthenticated])
# @has_permissions([PermissionEnum.ATTRIBUTE_LIST.name])
def getAllTaskType(request):
	task_types = TaskType.objects.all()
	total_elements = task_types.count()

	page = request.query_params.get('page')
	size = request.query_params.get('size')

	# Pagination
	pagination = Pagination()
	pagination.page = page
	pagination.size = size
	task_types = pagination.paginate_data(task_types)

	serializer = TaskTypeListSerializer(task_types, many=True)

	response = {
		'task_types': serializer.data,
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
	request=TaskTypeListSerializer,
	responses=TaskTypeListSerializer
)
@api_view(['GET'])
# @permission_classes([IsAuthenticated])
# @has_permissions([PermissionEnum.ATTRIBUTE_LIST.name])
def getAllTaskTypeWithoutPagination(request):
	task_types = TaskType.objects.all()

	serializer = TaskTypeListSerializer(task_types, many=True)

	response = {
		'task_types': serializer.data,
	}

	return Response(response, status=status.HTTP_200_OK)




@extend_schema(request=TaskTypeSerializer, responses=TaskTypeSerializer)
@api_view(['GET'])
# @permission_classes([IsAuthenticated])
# @has_permissions([PermissionEnum.ATTRIBUTE_DETAILS.name])
def getATaskType(request, pk):
	try:
		task_type = TaskType.objects.get(pk=pk)
		serializer = TaskTypeSerializer(task_type)
		return Response(serializer.data, status=status.HTTP_200_OK)
	except ObjectDoesNotExist:
		return Response({'detail': f"TaskType id - {pk} does't exists"}, status=status.HTTP_400_BAD_REQUEST)




@extend_schema(request=TaskTypeSerializer, responses=TaskTypeSerializer)
@api_view(['POST'])
@permission_classes([IsAuthenticated])
# @has_permissions([PermissionEnum.ATTRIBUTE_CREATE.name])
def createTaskType(request):
	data = request.data
	print('data: ', data)
	
	serializer = TaskTypeSerializer(data=data)

	if serializer.is_valid():
		serializer.save()
		return Response(serializer.data)
	else:
		return Response(serializer.errors)




@extend_schema(request=TaskTypeSerializer, responses=TaskTypeSerializer)
@api_view(['PUT'])
@permission_classes([IsAuthenticated])
# @has_permissions([PermissionEnum.ATTRIBUTE_UPDATE.name])
def updateTaskType(request, pk):
	data = request.data

	try:
		task_type = TaskType.objects.get(pk=pk)
	except ObjectDoesNotExist:
		return Response({'detail': f"TaskType id - {pk} doesn't exists"})

	serializer = TaskTypeSerializer(task_type, data=data)
	if serializer.is_valid():
		serializer.save()
		return Response(serializer.data, status=status.HTTP_200_OK)
	else:
		return Response(serializer.errors)
	




@extend_schema(request=TaskTypeSerializer, responses=TaskTypeSerializer)
@api_view(['DELETE'])
@permission_classes([IsAuthenticated])
# @has_permissions([PermissionEnum.ATTRIBUTE_DELETE.name])
def deleteTaskType(request, pk):
	try:
		task_type = TaskType.objects.get(pk=pk)
		task_type.delete()
		return Response({'detail': f'TaskType id - {pk} is deleted successfully'}, status=status.HTTP_200_OK)
	except ObjectDoesNotExist:
		return Response({'detail': f"TaskType id - {pk} does't exists"}, status=status.HTTP_400_BAD_REQUEST)


