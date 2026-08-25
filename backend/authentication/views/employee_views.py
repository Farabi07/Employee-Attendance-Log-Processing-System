from django.core.exceptions import ObjectDoesNotExist
from django.utils import timezone

from rest_framework import status
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response

from drf_spectacular.utils import extend_schema, OpenApiParameter

from authentication.models import Employee
from authentication.serializers import EmployeeSerializer, EmployeeListSerializer
from authentication.filters import EmployeeFilter
from authentication.permissions import IsManager, IsManagerOrModerator, HasActiveSubscription

from commons.pagination import Pagination




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
@permission_classes([IsManagerOrModerator, HasActiveSubscription])
def getAllEmployee(request):
	employees = Employee.objects.filter(organization=request.user.organization)
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
@permission_classes([IsManagerOrModerator, HasActiveSubscription])
def getAllEmployeeWithoutPagination(request):
	employees = Employee.objects.filter(organization=request.user.organization)

	serializer = EmployeeListSerializer(employees, many=True)

	return Response({'employees': serializer.data}, status=status.HTTP_200_OK)

@extend_schema(request=EmployeeSerializer, responses=EmployeeSerializer)
@api_view(['GET'])
@permission_classes([IsAuthenticated, HasActiveSubscription])
def getAEmployee(request, pk):
	try:
		employee = Employee.objects.get(pk=pk, organization=request.user.organization)
		serializer = EmployeeSerializer(employee)
		return Response(serializer.data)
	except ObjectDoesNotExist:
		return Response({'detail': f"Employee id - {pk} doesn't exists"}, status=status.HTTP_400_BAD_REQUEST)




@extend_schema(request=EmployeeSerializer, responses=EmployeeSerializer)
@api_view(['GET'])
@permission_classes([IsManagerOrModerator, HasActiveSubscription])
def searchEmployee(request):

	employees = EmployeeFilter(request.GET, queryset=Employee.objects.filter(organization=request.user.organization))
	employees = employees.qs

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




ALLOWED_CREATE_ROLES = {Employee.OrgRole.EMPLOYEE, Employee.OrgRole.MODERATOR}

@extend_schema(request=EmployeeSerializer, responses=EmployeeSerializer)
@api_view(['POST'])
@permission_classes([IsManager, HasActiveSubscription])
def createEmployee(request):
	data = request.data

	employee_data_dict = {}

	current_datetime = timezone.now()
	current_datetime = str(current_datetime)

	for key, value in data.items():
		if value != '' and value != '0':
			employee_data_dict[key] = value

	employee_data_dict['last_login'] = current_datetime
	# Always derive the tenant from the creator; a Manager can only ever
	# create Employees or Moderators within their own store, never another Manager.
	employee_data_dict['organization'] = request.user.organization_id
	requested_role = employee_data_dict.get('org_role')
	employee_data_dict['org_role'] = requested_role if requested_role in ALLOWED_CREATE_ROLES else Employee.OrgRole.EMPLOYEE

	serializer = EmployeeSerializer(data=employee_data_dict, many=False)

	if serializer.is_valid():
		serializer.save()
		return Response(serializer.data, status=status.HTTP_201_CREATED)
	else:
		return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)




@extend_schema(request=EmployeeSerializer, responses=EmployeeSerializer)
@api_view(['PUT'])
@permission_classes([IsManagerOrModerator, HasActiveSubscription])
def updateEmployee(request, pk):
	data = request.data
	filtered_data = {}
	for key, value in data.items():
		if value != '' and value != '0':
			filtered_data[key] = value

	# Role/tenant/pay changes are a Manager-only action, regardless of what
	# a Moderator might otherwise edit here.
	if not request.user.is_manager():
		filtered_data.pop('org_role', None)
		filtered_data.pop('hourly_rate', None)
		filtered_data.pop('payout_cycle', None)
	filtered_data.pop('organization', None)

	image = filtered_data.get('image', None)

	try:
		employee = Employee.objects.get(pk=int(pk), organization=request.user.organization)
	except ObjectDoesNotExist:
		return Response({'detail': f"Employee id - {pk} doesn't exists"}, status=status.HTTP_400_BAD_REQUEST)

	if type(image) == str and image is not None:
		filtered_data.pop('image')

	serializer = EmployeeSerializer(employee, data=filtered_data, partial=True)
	if serializer.is_valid():
		serializer.save()
		return Response(serializer.data, status=status.HTTP_200_OK)
	else:
		return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)




@extend_schema(request=EmployeeSerializer, responses=EmployeeSerializer)
@api_view(['DELETE'])
@permission_classes([IsManagerOrModerator, HasActiveSubscription])
def deleteEmployee(request, pk):
	try:
		employee = Employee.objects.get(pk=pk, organization=request.user.organization)
		employee.delete()
		return Response({'detail': f'Employee id - {pk} is deleted successfully'}, status=status.HTTP_200_OK)
	except ObjectDoesNotExist:
		return Response({'detail': f"Employee id - {pk} doesn't exists"}, status=status.HTTP_400_BAD_REQUEST)
