from django.core.exceptions import ObjectDoesNotExist
from django.utils import timezone

from rest_framework import status
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response

from drf_spectacular.utils import extend_schema, OpenApiParameter

from authentication.models import Employee, Role
from authentication.serializers import EmployeeSerializer, EmployeeListSerializer
from authentication.filters import EmployeeFilter
from authentication.permissions import IsManager, IsManagerOrModerator, CanAddEmployees, HasActiveSubscription

from commons.pagination import Pagination

from wallet.models import record_rate_change
from wallet.notify import notify_rate_changed




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
@permission_classes([CanAddEmployees, HasActiveSubscription])
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
	requested_role = employee_data_dict.pop('org_role', None)
	if request.user.is_manager():
		role_name = requested_role if requested_role in ALLOWED_CREATE_ROLES else Employee.OrgRole.EMPLOYEE
	else:
		# A Moderator granted "add employees" can still only ever create
		# plain Employees — never another Moderator, regardless of what's
		# requested. Creating Moderators stays Manager-only.
		role_name = Employee.OrgRole.EMPLOYEE
	employee_data_dict['role'] = Role.objects.get(name=role_name.upper()).id

	# Whoever sets the pay picks the currency it's paid in — defaults to
	# the store's own currency if they don't specify one.
	if employee_data_dict.get('hourly_rate') and not employee_data_dict.get('currency'):
		employee_data_dict['currency'] = request.user.organization.currency

	serializer = EmployeeSerializer(data=employee_data_dict, many=False)

	if serializer.is_valid():
		employee = serializer.save()
		if employee.hourly_rate is not None:
			record_rate_change(
				employee, old_rate=None, new_rate=employee.hourly_rate,
				old_currency=None, new_currency=employee.currency, changed_by=request.user,
			)
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

	# Role changes are Manager-only regardless of anything else. Pay changes
	# (rate/currency/cycle) follow the same permission as adding employees —
	# a Moderator granted that can also adjust pay for staff they manage.
	requested_role = filtered_data.pop('org_role', None)
	if request.user.is_manager() and requested_role:
		try:
			filtered_data['role'] = Role.objects.get(name=requested_role.upper()).id
		except Role.DoesNotExist:
			return Response({'detail': f"'{requested_role}' is not a valid org_role"}, status=status.HTTP_400_BAD_REQUEST)
	if not request.user.can_add_employees():
		filtered_data.pop('hourly_rate', None)
		filtered_data.pop('currency', None)
		filtered_data.pop('payout_cycle', None)
	filtered_data.pop('organization', None)

	image = filtered_data.get('image', None)

	try:
		employee = Employee.objects.get(pk=int(pk), organization=request.user.organization)
	except ObjectDoesNotExist:
		return Response({'detail': f"Employee id - {pk} doesn't exists"}, status=status.HTTP_400_BAD_REQUEST)

	if type(image) == str and image is not None:
		filtered_data.pop('image')

	old_rate, old_currency = employee.hourly_rate, employee.currency

	serializer = EmployeeSerializer(employee, data=filtered_data, partial=True)
	if serializer.is_valid():
		employee = serializer.save()
		rate_history = record_rate_change(
			employee, old_rate=old_rate, new_rate=employee.hourly_rate,
			old_currency=old_currency, new_currency=employee.currency, changed_by=request.user,
		)
		if rate_history:
			notify_rate_changed(rate_history)
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
