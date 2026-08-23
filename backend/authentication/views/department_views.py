from django.core.exceptions import ObjectDoesNotExist

from rest_framework import serializers, status
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response

from drf_spectacular.utils import  extend_schema, OpenApiParameter

from authentication.decorators import has_permissions
from authentication.models import Department
from authentication.serializers import DepartmentSerializer, DepartmentListSerializer
from authentication.filters import DepartmentFilter

from commons.enums import PermissionEnum
from commons.pagination import Pagination




# Create your views here.

@extend_schema(
	parameters=[
		OpenApiParameter("page"),
		OpenApiParameter("size"),
  ],
	request=DepartmentSerializer,
	responses=DepartmentSerializer
)
@api_view(['GET'])
# @permission_classes([IsAuthenticated])
# @has_permissions([PermissionEnum.PERMISSION_LIST_VIEW.name])
def getAllDepartment(request):
	departments = Department.objects.all()
	total_elements = departments.count()

	page = request.query_params.get('page')
	size = request.query_params.get('size')

	# Pagination
	pagination = Pagination()
	pagination.page = page
	pagination.size = size
	departments = pagination.paginate_data(departments)

	serializer = DepartmentListSerializer(departments, many=True)

	response = {
		'departments': serializer.data,
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
	request=DepartmentSerializer,
	responses=DepartmentSerializer
)
@api_view(['GET'])
# @permission_classes([IsAuthenticated])
# @has_permissions([PermissionEnum.PERMISSION_LIST_VIEW.name])
def getAllDepartmentWithoutPagination(request):
	departments = Department.objects.all()

	serializer = DepartmentListSerializer(departments, many=True)

	return Response({'departments': serializer.data}, status=status.HTTP_200_OK)




@extend_schema(request=DepartmentSerializer, responses=DepartmentSerializer)
@api_view(['GET'])
# @permission_classes([IsAuthenticated])
# @has_permissions([PermissionEnum.PERMISSION_DETAILS_VIEW.name])
def getADepartment(request, pk):
	try:
		department = Department.objects.get(pk=pk)
		serializer = DepartmentSerializer(department)
		return Response(serializer.data, status=status.HTTP_200_OK)
	except ObjectDoesNotExist:
		return Response({'detail': f"Department id - {pk} doesn't exists"}, status=status.HTTP_400_BAD_REQUEST)




@extend_schema(request=DepartmentSerializer, responses=DepartmentSerializer)
@api_view(['GET'])
# @permission_classes([IsAuthenticated])
# @has_permissions([PermissionEnum.PRODUCT_DETAILS.name])
def searchDepartment(request):

	departments = DepartmentFilter(request.GET, queryset=Department.objects.all())
	departments = departments.qs

	print('departments: ', departments)

	total_elements = departments.count()

	page = request.query_params.get('page')
	size = request.query_params.get('size')

	# Pagination
	pagination = Pagination()
	pagination.page = page
	pagination.size = size
	departments = pagination.paginate_data(departments)

	serializer = DepartmentListSerializer(departments, many=True)

	response = {
		'departments': serializer.data,
		'page': pagination.page,
		'size': pagination.size,
		'total_pages': pagination.total_pages,
		'total_elements': total_elements,
	}

	if len(departments) > 0:
		return Response(response, status=status.HTTP_200_OK)
	else:
		return Response({'detail': f"There are no departments matching your search"}, status=status.HTTP_400_BAD_REQUEST)




@extend_schema(request=DepartmentSerializer, responses=DepartmentSerializer)
@api_view(['POST'])
@permission_classes([IsAuthenticated])
# @has_permissions([PermissionEnum.PERMISSION_CREATE.name])
def createDepartment(request):
	data = request.data
	filtered_data = {}

	for key, value in data.items():
		if value != '' and value != '0':
			filtered_data[key] = value

	serializer = DepartmentSerializer(data=filtered_data)

	if serializer.is_valid():
		serializer.save()
		return Response(serializer.data, status=status.HTTP_201_CREATED)
	else:
		return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)




@extend_schema(request=DepartmentSerializer, responses=DepartmentSerializer)
@api_view(['PUT'])
@permission_classes([IsAuthenticated])
# @has_permissions([PermissionEnum.PERMISSION_UPDATE.name, PermissionEnum.PERMISSION_PARTIAL_UPDATE.name])
def updateDepartment(request,pk):
	try:
		department = Department.objects.get(pk=pk)
		data = request.data
		serializer = DepartmentSerializer(department, data=data)
		if serializer.is_valid():
			serializer.save()
			return Response(serializer.data, status=status.HTTP_200_OK)
		else:
			return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
	except ObjectDoesNotExist:
		return Response({'detail': f"Department id - {pk} doesn't exists"}, status=status.HTTP_400_BAD_REQUEST)




@extend_schema(request=DepartmentSerializer, responses=DepartmentSerializer)
@api_view(['DELETE'])
@permission_classes([IsAuthenticated])
# @has_permissions([PermissionEnum.PERMISSION_DELETE.name])
def deleteDepartment(request, pk):
	try:
		department = Department.objects.get(pk=pk)
		department.delete()
		return Response({'detail': f'Department id - {pk} is deleted successfully'}, status=status.HTTP_200_OK)
	except ObjectDoesNotExist:
		return Response({'detail': f"Department id - {pk} doesn't exists"}, status=status.HTTP_400_BAD_REQUEST)
