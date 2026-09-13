from datetime import date, timedelta

from django.core.exceptions import ObjectDoesNotExist

from rest_framework import status
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response

from drf_spectacular.utils import extend_schema, OpenApiParameter

from authentication.models import Employee
from attendance.models import Roster, Shift
from attendance.serializers import RosterSerializer, RosterListSerializer
from attendance.notify import notify_roster_assigned
from authentication.permissions import IsManagerOrModerator, HasActiveSubscription

from commons.pagination import Pagination




# Create your views here.

@extend_schema(
	parameters=[
		OpenApiParameter("page"),
		OpenApiParameter("size"),
  ],
	request=RosterListSerializer,
	responses=RosterListSerializer
)
@api_view(['GET'])
@permission_classes([IsManagerOrModerator, HasActiveSubscription])
def getAllRoster(request):
	rosters = Roster.objects.filter(employee__organization=request.user.organization).select_related('employee', 'shift', 'created_by', 'updated_by')
	total_elements = rosters.count()

	page = request.query_params.get('page')
	size = request.query_params.get('size')

	pagination = Pagination()
	pagination.page = page
	pagination.size = size
	rosters = pagination.paginate_data(rosters)

	serializer = RosterListSerializer(rosters, many=True)

	response = {
		'rosters': serializer.data,
		'page': pagination.page,
		'size': pagination.size,
		'total_pages': pagination.total_pages,
		'total_elements': total_elements,
	}

	return Response(response, status=status.HTTP_200_OK)




@extend_schema(request=RosterListSerializer, responses=RosterListSerializer)
@api_view(['GET'])
@permission_classes([IsManagerOrModerator, HasActiveSubscription])
def getAllRosterWithoutPagination(request):
	rosters = Roster.objects.filter(employee__organization=request.user.organization).select_related('employee', 'shift', 'created_by', 'updated_by')

	serializer = RosterListSerializer(rosters, many=True)

	response = {
		'rosters': serializer.data,
	}

	return Response(response, status=status.HTTP_200_OK)




@extend_schema(
	parameters=[
		OpenApiParameter("page"),
		OpenApiParameter("size"),
  ],
	request=RosterListSerializer,
	responses=RosterListSerializer
)
@api_view(['GET'])
@permission_classes([IsAuthenticated, HasActiveSubscription])
def getAllRosterByEmployeeId(request, employee_id):
	rosters = Roster.objects.filter(employee__id=employee_id, employee__organization=request.user.organization).select_related('employee', 'shift', 'created_by', 'updated_by')
	total_elements = rosters.count()

	page = request.query_params.get('page')
	size = request.query_params.get('size')

	pagination = Pagination()
	pagination.page = page
	pagination.size = size
	rosters = pagination.paginate_data(rosters)

	serializer = RosterListSerializer(rosters, many=True)

	response = {
		'rosters': serializer.data,
		'page': pagination.page,
		'size': pagination.size,
		'total_pages': pagination.total_pages,
		'total_elements': total_elements,
	}

	return Response(response, status=status.HTTP_200_OK)




@extend_schema(request=RosterSerializer, responses=RosterSerializer)
@api_view(['GET'])
@permission_classes([IsManagerOrModerator, HasActiveSubscription])
def getARoster(request, pk):
	try:
		roster = Roster.objects.get(pk=pk, employee__organization=request.user.organization)
		serializer = RosterListSerializer(roster)
		return Response(serializer.data, status=status.HTTP_200_OK)
	except ObjectDoesNotExist:
		return Response({'detail': f"Roster id - {pk} does't exists"}, status=status.HTTP_400_BAD_REQUEST)




@extend_schema(request=RosterSerializer, responses=RosterSerializer)
@api_view(['POST'])
@permission_classes([IsManagerOrModerator, HasActiveSubscription])
def createRoster(request):
	"""`repeat_weeks` (optional, 1-12) assigns the same employee/shift on
	the same weekday for that many consecutive weeks in one request —
	each week is still an ordinary, independently editable Roster row,
	not a recurring rule. A week that collides with an existing
	assignment for that employee (Roster.Meta.unique_together) is
	skipped rather than failing the whole batch, since the other weeks
	are still perfectly valid requests."""
	data = request.data

	try:
		employee = Employee.objects.get(pk=data.get('employee'), organization=request.user.organization)
	except (ObjectDoesNotExist, ValueError, TypeError):
		return Response({'detail': 'Employee not found in your organization'}, status=status.HTTP_400_BAD_REQUEST)

	shift_id = data.get('shift')
	if shift_id and not Shift.objects.filter(pk=shift_id, organization=request.user.organization).exists():
		return Response({'detail': 'Shift not found in your organization'}, status=status.HTTP_400_BAD_REQUEST)

	try:
		repeat_weeks = max(1, min(int(data.get('repeat_weeks') or 1), 12))
	except (TypeError, ValueError):
		repeat_weeks = 1

	if repeat_weeks == 1:
		serializer = RosterSerializer(data=data)
		if serializer.is_valid():
			roster = serializer.save()
			notify_roster_assigned(roster)
			return Response(serializer.data, status=status.HTTP_201_CREATED)
		return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

	try:
		base_date = date.fromisoformat(str(data.get('date')))
	except (TypeError, ValueError):
		return Response({'detail': 'date must be in YYYY-MM-DD format'}, status=status.HTTP_400_BAD_REQUEST)

	created = []
	skipped_dates = []
	for week in range(repeat_weeks):
		week_date = base_date + timedelta(weeks=week)
		row_data = {**data, 'date': week_date.isoformat()}
		serializer = RosterSerializer(data=row_data)
		if serializer.is_valid():
			roster = serializer.save()
			notify_roster_assigned(roster)
			created.append(serializer.data)
		else:
			skipped_dates.append(week_date.isoformat())

	if not created:
		return Response(
			{'detail': 'That employee already has a shift on every one of those dates.'},
			status=status.HTTP_400_BAD_REQUEST,
		)

	return Response({'created': created, 'skipped_dates': skipped_dates}, status=status.HTTP_201_CREATED)




@extend_schema(request=RosterSerializer, responses=RosterSerializer)
@api_view(['PUT'])
@permission_classes([IsManagerOrModerator, HasActiveSubscription])
def updateRoster(request, pk):
	data = request.data

	try:
		roster = Roster.objects.get(pk=pk, employee__organization=request.user.organization)
	except ObjectDoesNotExist:
		return Response({'detail': f"Roster id - {pk} doesn't exists"}, status=status.HTTP_400_BAD_REQUEST)

	serializer = RosterSerializer(roster, data=data, partial=True)
	if serializer.is_valid():
		roster = serializer.save()
		notify_roster_assigned(roster, updated=True)
		return Response(serializer.data, status=status.HTTP_200_OK)
	else:
		return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)




@extend_schema(request=RosterSerializer, responses=RosterSerializer)
@api_view(['DELETE'])
@permission_classes([IsManagerOrModerator, HasActiveSubscription])
def deleteRoster(request, pk):
	try:
		roster = Roster.objects.get(pk=pk, employee__organization=request.user.organization)
		roster.delete()
		return Response({'detail': f'Roster id - {pk} is deleted successfully'}, status=status.HTTP_200_OK)
	except ObjectDoesNotExist:
		return Response({'detail': f"Roster id - {pk} does't exists"}, status=status.HTTP_400_BAD_REQUEST)
