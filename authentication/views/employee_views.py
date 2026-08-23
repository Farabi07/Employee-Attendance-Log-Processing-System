from re import I
from django.contrib.auth.hashers import make_password
from django.core.exceptions import ObjectDoesNotExist
from django.http import HttpResponse
from django.shortcuts import render
from django.utils import timezone

from rest_framework import status
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAdminUser
from rest_framework.response import Response

from drf_spectacular.utils import extend_schema, OpenApiParameter

from authentication.decorators import has_permissions
from authentication.models import Employee
from authentication.serializers import EmployeeSerializer, EmployeeListSerializer
from authentication.filters import EmployeeFilter

from commons.pagination import Pagination
from commons.enums import PermissionEnum




# Create your views here.

@extend_schema(
	parameters=[
		OpenApiParameter("page"),
		OpenApiParameter("size"),
  ],
	request=EmployeeSerializer,
	responses=EmployeeSerializer
)
@api_view(['GET'])
# @permission_classes([IsAdminUser])
# @has_permissions([PermissionEnum.EMPLOYEE_LIST.name])
def getAllEmployee(request):
	employees = Employee.objects.all()
	total_elements = employees.count()

	page = request.query_params.get('page')
	size = request.query_params.get('size')

	# Pagination
	pagination = Pagination()
	pagination.page = page
	pagination.size = size
	employees = pagination.paginate_data(employees)

	serializer = EmployeeListSerializer(employees, many=True)

	response = {
		'employees': serializer.data,
		'page': pagination.page,
		'size': pagination.size,
		'total_pages': pagination.total_pages,
		'total_elements': total_elements,
	}

	return Response(response, status=status.HTTP_200_OK)




@extend_schema(
	request=EmployeeSerializer,
	responses=EmployeeSerializer
)
@api_view(['GET'])
# @permission_classes([IsAdminUser])
# @has_permissions([PermissionEnum.EMPLOYEE_LIST.name])
def getAllEmployeeWithoutPagination(request):
	employees = Employee.objects.all()

	serializer = EmployeeListSerializer(employees, many=True)

	return Response({'employees': serializer.data}, status=status.HTTP_200_OK)

@extend_schema(request=EmployeeSerializer, responses=EmployeeSerializer)
@api_view(['GET'])
# @permission_classes([IsAdminUser])
# @has_permissions([PermissionEnum.EMPLOYEE_DETAILS.name])
def getAEmployee(request, pk):
	try:
		employee = Employee.objects.get(pk=pk)
		serializer = EmployeeSerializer(employee)
		return Response(serializer.data)
	except ObjectDoesNotExist:
		return Response({'detail': f"Employee id - {pk} doesn't exists"})




@extend_schema(request=EmployeeSerializer, responses=EmployeeSerializer)
@api_view(['GET'])
# @permission_classes([IsAuthenticated])
# @has_permissions([PermissionEnum.PRODUCT_DETAILS.name])
def searchEmployee(request):

	employees = EmployeeFilter(request.GET, queryset=Employee.objects.all())
	employees = employees.qs

	print('employees: ', employees)

	total_elements = employees.count()

	page = request.query_params.get('page')
	size = request.query_params.get('size')

	# Pagination
	pagination = Pagination()
	pagination.page = page
	pagination.size = size
	employees = pagination.paginate_data(employees)

	serializer = EmployeeListSerializer(employees, many=True)

	response = {
		'employees': serializer.data,
		'page': pagination.page,
		'size': pagination.size,
		'total_pages': pagination.total_pages,
		'total_elements': total_elements,
	}

	if len(employees) > 0:
		return Response(response, status=status.HTTP_200_OK)
	else:
		return Response({'detail': f"There are no employees matching your search"}, status=status.HTTP_400_BAD_REQUEST)



		
@extend_schema(request=EmployeeSerializer, responses=EmployeeSerializer)
@api_view(['POST'])
@permission_classes([IsAdminUser])
# @has_permissions([PermissionEnum.EMPLOYEE_CREATE.name])
def createEmployee(request):
	data = request.data

	employee_data_dict = {}

	current_datetime = timezone.now()
	current_datetime = str(current_datetime)
	print('current_datetime str: ', current_datetime)

	try:
		group_obj = Group.objects.get(name='Salary')
	except Group.ObjectDoesNotExist:
		return Response("Please insert a 'Salary' data in the Group table and then try again")

	username = data.get('username', None)
	if username is None:
		return Response("Please insert username.")
		
	for key, value in data.items():
		if value != '' and value != '0':
			employee_data_dict[key] = value
		
	employee_data_dict['last_login'] = current_datetime

	print('employee_data_dict: ', employee_data_dict)

	serializer = EmployeeSerializer(data=employee_data_dict, many=False)
	
	if serializer.is_valid():
		serializer.save()

		employee_obj = Employee.objects.get(username=username)

		employee_ledger_obj = LedgerAccount.objects.create(name=username, ledger_type='Employee Ledger', reference_id=employee_obj.id, head_group=group_obj)
		
		return Response(serializer.data, status=status.HTTP_201_CREATED)
	else:
		return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)




@extend_schema(request=EmployeeSerializer, responses=EmployeeSerializer)
@api_view(['PUT'])
@permission_classes([IsAdminUser])
# @has_permissions([PermissionEnum.EMPLOYEE_UPDATE.name])
def updateEmployee(request,pk):
	data = request.data
	print('employee data: ', data)
	print('content_type: ', request.content_type)
	filtered_data = {}
	for key, value in data.items():
		if value != '' and value != '0':
			filtered_data[key] = value

	print('filtered_data: ', filtered_data)

	image = filtered_data.get('image', None)
	
	try:
		employee = Employee.objects.get(pk=int(pk))
	except ObjectDoesNotExist:
		return Response({'detail': f"Customer id - {pk} doesn't exists"})

	if type(image) == str and image is not None:
		poped_image = filtered_data.pop('image')
		serializer = EmployeeSerializer(employee, data=filtered_data)
		if serializer.is_valid():
			serializer.save()
			return Response(serializer.data, status=status.HTTP_200_OK)
		else:
			return Response(serializer.errors)
	else:
		serializer = EmployeeSerializer(employee, data=filtered_data)
		if serializer.is_valid():
			serializer.save()
			return Response(serializer.data, status=status.HTTP_200_OK)
		else:
			return Response(serializer.errors)




@extend_schema(request=EmployeeSerializer, responses=EmployeeSerializer)
@api_view(['DELETE'])
@permission_classes([IsAdminUser])
# @has_permissions([PermissionEnum.EMPLOYEE_DELETE.name])
def deleteEmployee(request, pk):
	try:
		employee = Employee.objects.get(pk=pk)
		employee.delete()
		return Response({'detail': f'Employee id - {pk} is deleted successfully'})
	except ObjectDoesNotExist:
		return Response({'detail': f"Employee id - {pk} doesn't exists"})

