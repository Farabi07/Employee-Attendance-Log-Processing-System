from django.core.exceptions import ObjectDoesNotExist

from rest_framework import status
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response

from drf_spectacular.utils import extend_schema

from authentication.models import Employee
from authentication.permissions import IsManagerOrModerator, HasActiveSubscription

from attendance.models import Availability
from attendance.serializers import AvailabilitySerializer, AvailabilityListSerializer




VALID_DAYS = {choice for choice, _label in Availability.DayOfWeek.choices}




@extend_schema(request=None, responses=AvailabilitySerializer)
@api_view(['GET'])
@permission_classes([IsAuthenticated, HasActiveSubscription])
def getMyAvailability(request):
	rows = Availability.objects.filter(employee_id=request.user.id)
	return Response({'availability': AvailabilitySerializer(rows, many=True).data}, status=status.HTTP_200_OK)




@extend_schema(request=AvailabilitySerializer, responses=AvailabilitySerializer)
@api_view(['PUT'])
@permission_classes([IsAuthenticated, HasActiveSubscription])
def setMyAvailability(request):
	"""Bulk upsert — the client always sends its full 7-day week (one entry
	per day_of_week), and each day is replaced wholesale rather than
	patched, since a day's availability is one indivisible unit (available/
	not, what hours) rather than something with independently-editable
	sub-fields."""
	days = request.data.get('days')
	if not isinstance(days, list) or not days:
		return Response({'detail': 'days must be a non-empty list'}, status=status.HTTP_400_BAD_REQUEST)

	saved = []
	for entry in days:
		day_of_week = entry.get('day_of_week')
		if day_of_week not in VALID_DAYS:
			return Response({'detail': f"Invalid day_of_week: {day_of_week}"}, status=status.HTTP_400_BAD_REQUEST)

		availability, _created = Availability.objects.update_or_create(
			employee_id=request.user.id,
			day_of_week=day_of_week,
			defaults={
				'is_available': bool(entry.get('is_available', True)),
				'start_time': entry.get('start_time') or None,
				'end_time': entry.get('end_time') or None,
				'note': entry.get('note') or None,
			},
		)
		saved.append(availability)

	return Response({'availability': AvailabilitySerializer(saved, many=True).data}, status=status.HTTP_200_OK)




@extend_schema(request=None, responses=AvailabilityListSerializer)
@api_view(['GET'])
@permission_classes([IsManagerOrModerator, HasActiveSubscription])
def getEmployeeAvailability(request, employee_id):
	try:
		Employee.objects.get(pk=employee_id, organization=request.user.organization)
	except ObjectDoesNotExist:
		return Response({'detail': f"Employee id - {employee_id} doesn't exist"}, status=status.HTTP_400_BAD_REQUEST)

	rows = Availability.objects.filter(employee_id=employee_id)
	return Response({'availability': AvailabilityListSerializer(rows, many=True).data}, status=status.HTTP_200_OK)




@extend_schema(request=None, responses=AvailabilityListSerializer)
@api_view(['GET'])
@permission_classes([IsManagerOrModerator, HasActiveSubscription])
def getAllAvailability(request):
	"""Everyone's availability in the store at once — what the Roster
	screen needs to show an at-a-glance hint per employee/day while
	scheduling, without a round-trip per employee."""
	rows = Availability.objects.filter(employee__organization=request.user.organization)
	return Response({'availability': AvailabilityListSerializer(rows, many=True).data}, status=status.HTTP_200_OK)
