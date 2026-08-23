from django.core.exceptions import ObjectDoesNotExist

from rest_framework import status
from rest_framework.decorators import api_view, permission_classes, parser_classes
from rest_framework.parsers import JSONParser, MultiPartParser, FormParser
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response

from drf_spectacular.utils import  extend_schema, OpenApiParameter

from authentication.decorators import has_permissions

from support.models import ToDoTask
from support.serializers import ToDoTaskSerializer, ToDoTaskListSerializer

from commons.pagination import Pagination
from commons.enums import PermissionEnum

import datetime




# Create your views here.

@extend_schema(
	parameters=[
		OpenApiParameter("page"),
		OpenApiParameter("size"),
  ],
	request=ToDoTaskListSerializer,
	responses=ToDoTaskListSerializer
)
@api_view(['GET'])
# @permission_classes([IsAuthenticated])
# @has_permissions([PermissionEnum.ATTRIBUTE_LIST.name])
def getAllToDoTask(request):
	todo_tasks = ToDoTask.objects.all()
	total_elements = todo_tasks.count()

	page = request.query_params.get('page')
	size = request.query_params.get('size')

	# Pagination
	pagination = Pagination()
	pagination.page = page
	pagination.size = size
	todo_tasks = pagination.paginate_data(todo_tasks)

	serializer = ToDoTaskListSerializer(todo_tasks, many=True)

	response = {
		'todo_tasks': serializer.data,
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
	request=ToDoTaskListSerializer,
	responses=ToDoTaskListSerializer
)
@api_view(['GET'])
# @permission_classes([IsAuthenticated])
# @has_permissions([PermissionEnum.ATTRIBUTE_LIST.name])
def getAllToDoTaskWithoutPagination(request):
	todo_tasks = ToDoTask.objects.all()

	serializer = ToDoTaskListSerializer(todo_tasks, many=True)

	response = {
		'todo_tasks': serializer.data,
	}

	return Response(response, status=status.HTTP_200_OK)




@extend_schema(
	parameters=[
		OpenApiParameter("page"),
		OpenApiParameter("size"),
  ],
	request=ToDoTaskListSerializer,
	responses=ToDoTaskListSerializer
)
@api_view(['GET'])
# @permission_classes([IsAuthenticated])
# @has_permissions([PermissionEnum.ATTRIBUTE_LIST.name])
def getAllToDoTaskByUserId(request, user_id):
	todo_tasks = ToDoTask.objects.filter(user__id=user_id)
	total_elements = todo_tasks.count()

	page = request.query_params.get('page')
	size = request.query_params.get('size')

	# Pagination
	pagination = Pagination()
	pagination.page = page
	pagination.size = size
	todo_tasks = pagination.paginate_data(todo_tasks)

	serializer = ToDoTaskListSerializer(todo_tasks, many=True)

	response = {
		'todo_tasks': serializer.data,
		'page': pagination.page,
		'size': pagination.size,
		'total_pages': pagination.total_pages,
		'total_elements': total_elements,
	}

	return Response(response, status=status.HTTP_200_OK)




@extend_schema(request=ToDoTaskSerializer, responses=ToDoTaskSerializer)
@api_view(['GET'])
# @permission_classes([IsAuthenticated])
# @has_permissions([PermissionEnum.ATTRIBUTE_DETAILS.name])
def getAToDoTask(request, pk):
	try:
		todo_task = ToDoTask.objects.get(pk=pk)
		serializer = ToDoTaskSerializer(todo_task)
		return Response(serializer.data, status=status.HTTP_200_OK)
	except ObjectDoesNotExist:
		return Response({'detail': f"ToDoTask id - {pk} does't exists"}, status=status.HTTP_400_BAD_REQUEST)




@extend_schema(request=ToDoTaskSerializer, responses=ToDoTaskSerializer)
@api_view(['POST'])
@permission_classes([IsAuthenticated])
# @has_permissions([PermissionEnum.ATTRIBUTE_CREATE.name])
def createToDoTask(request):
	data = request.data
	print('data: ', data)
	
	serializer = ToDoTaskSerializer(data=data)

	if serializer.is_valid():
		serializer.save()
		return Response(serializer.data)
	else:
		return Response(serializer.errors)




@extend_schema(request=ToDoTaskSerializer, responses=ToDoTaskSerializer)
@api_view(['PUT'])
@permission_classes([IsAuthenticated])
# @has_permissions([PermissionEnum.ATTRIBUTE_UPDATE.name])
def updateToDoTask(request, pk):
	data = request.data

	try:
		todo_task = ToDoTask.objects.get(pk=pk)
	except ObjectDoesNotExist:
		return Response({'detail': f"ToDoTask id - {pk} doesn't exists"})

	serializer = ToDoTaskSerializer(todo_task, data=data)
	if serializer.is_valid():
		serializer.save()
		return Response(serializer.data, status=status.HTTP_200_OK)
	else:
		return Response(serializer.errors)
	




@extend_schema(request=ToDoTaskSerializer, responses=ToDoTaskSerializer)
@api_view(['DELETE'])
@permission_classes([IsAuthenticated])
# @has_permissions([PermissionEnum.ATTRIBUTE_DELETE.name])
def deleteToDoTask(request, pk):
	try:
		todo_task = ToDoTask.objects.get(pk=pk)
		todo_task.delete()
		return Response({'detail': f'ToDoTask id - {pk} is deleted successfully'}, status=status.HTTP_200_OK)
	except ObjectDoesNotExist:
		return Response({'detail': f"ToDoTask id - {pk} does't exists"}, status=status.HTTP_400_BAD_REQUEST)


