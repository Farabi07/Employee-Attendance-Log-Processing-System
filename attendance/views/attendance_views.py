from datetime import datetime, timedelta
from decimal import Decimal
from io import BytesIO

import qrcode

from django.core.exceptions import ObjectDoesNotExist
from django.http import HttpResponse
from django.utils import timezone

from rest_framework import status
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated, IsAdminUser
from rest_framework.response import Response

from drf_spectacular.utils import extend_schema, OpenApiParameter

from authentication.models import Branch, Employee

from attendance.models import Attendance, AttendanceQRToken, Roster
from attendance.serializers import AttendanceSerializer, AttendanceListSerializer, AttendanceQRTokenSerializer
from attendance.filters import AttendanceFilter

from commons.pagination import Pagination




# Create your views here.

@extend_schema(
	parameters=[
		OpenApiParameter("page"),
		OpenApiParameter("size"),
  ],
	request=AttendanceListSerializer,
	responses=AttendanceListSerializer
)
@api_view(['GET'])
@permission_classes([IsAuthenticated])
def getAllAttendance(request):
	attendances = Attendance.objects.all()
	total_elements = attendances.count()

	page = request.query_params.get('page')
	size = request.query_params.get('size')

	pagination = Pagination()
	pagination.page = page
	pagination.size = size
	attendances = pagination.paginate_data(attendances)

	serializer = AttendanceListSerializer(attendances, many=True)

	response = {
		'attendances': serializer.data,
		'page': pagination.page,
		'size': pagination.size,
		'total_pages': pagination.total_pages,
		'total_elements': total_elements,
	}

	return Response(response, status=status.HTTP_200_OK)




@extend_schema(request=AttendanceListSerializer, responses=AttendanceListSerializer)
@api_view(['GET'])
@permission_classes([IsAuthenticated])
def getAllAttendanceWithoutPagination(request):
	attendances = Attendance.objects.all()

	serializer = AttendanceListSerializer(attendances, many=True)

	response = {
		'attendances': serializer.data,
	}

	return Response(response, status=status.HTTP_200_OK)




@extend_schema(
	parameters=[
		OpenApiParameter("page"),
		OpenApiParameter("size"),
		OpenApiParameter("date"),
		OpenApiParameter("date_from"),
		OpenApiParameter("date_to"),
		OpenApiParameter("status"),
  ],
	request=AttendanceListSerializer,
	responses=AttendanceListSerializer
)
@api_view(['GET'])
@permission_classes([IsAuthenticated])
def searchAttendance(request):
	attendances = AttendanceFilter(request.GET, queryset=Attendance.objects.all())
	attendances = attendances.qs

	total_elements = attendances.count()

	page = request.query_params.get('page')
	size = request.query_params.get('size')

	pagination = Pagination()
	pagination.page = page
	pagination.size = size
	attendances = pagination.paginate_data(attendances)

	serializer = AttendanceListSerializer(attendances, many=True)

	response = {
		'attendances': serializer.data,
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
	request=AttendanceListSerializer,
	responses=AttendanceListSerializer
)
@api_view(['GET'])
@permission_classes([IsAuthenticated])
def getAllAttendanceByEmployeeId(request, employee_id):
	attendances = Attendance.objects.filter(employee__id=employee_id)
	total_elements = attendances.count()

	page = request.query_params.get('page')
	size = request.query_params.get('size')

	pagination = Pagination()
	pagination.page = page
	pagination.size = size
	attendances = pagination.paginate_data(attendances)

	serializer = AttendanceListSerializer(attendances, many=True)

	response = {
		'attendances': serializer.data,
		'page': pagination.page,
		'size': pagination.size,
		'total_pages': pagination.total_pages,
		'total_elements': total_elements,
	}

	return Response(response, status=status.HTTP_200_OK)




@extend_schema(request=AttendanceSerializer, responses=AttendanceSerializer)
@api_view(['GET'])
@permission_classes([IsAuthenticated])
def getAAttendance(request, pk):
	try:
		attendance = Attendance.objects.get(pk=pk)
		serializer = AttendanceListSerializer(attendance)
		return Response(serializer.data, status=status.HTTP_200_OK)
	except ObjectDoesNotExist:
		return Response({'detail': f"Attendance id - {pk} does't exists"}, status=status.HTTP_400_BAD_REQUEST)




@extend_schema(request=AttendanceListSerializer, responses=AttendanceListSerializer)
@api_view(['GET'])
@permission_classes([IsAuthenticated])
def getMyTodayAttendance(request):
	try:
		employee = Employee.objects.get(pk=request.user.pk)
	except ObjectDoesNotExist:
		return Response({'detail': 'Only employees have attendance records'}, status=status.HTTP_400_BAD_REQUEST)

	attendance = Attendance.objects.filter(employee=employee, date=timezone.localdate()).first()
	if not attendance:
		return Response(None, status=status.HTTP_200_OK)

	serializer = AttendanceListSerializer(attendance)
	return Response(serializer.data, status=status.HTTP_200_OK)




@extend_schema(request=None, responses=AttendanceListSerializer)
@api_view(['POST'])
@permission_classes([IsAuthenticated])
def checkIn(request):
	token = request.data.get('token')
	if not token:
		return Response({'detail': 'token is required'}, status=status.HTTP_400_BAD_REQUEST)

	try:
		qr_token = AttendanceQRToken.objects.get(token=token, is_active=True)
	except ObjectDoesNotExist:
		return Response({'detail': 'Invalid or inactive QR code'}, status=status.HTTP_400_BAD_REQUEST)

	try:
		employee = Employee.objects.get(pk=request.user.pk)
	except ObjectDoesNotExist:
		return Response({'detail': 'Only employees can check in'}, status=status.HTTP_400_BAD_REQUEST)

	today = timezone.localdate()
	now = timezone.now()

	attendance, created = Attendance.objects.get_or_create(
		employee=employee,
		date=today,
		defaults={'branch': qr_token.branch, 'created_by': request.user}
	)

	if attendance.check_in_time:
		return Response({'detail': 'Already checked in today'}, status=status.HTTP_400_BAD_REQUEST)

	attendance.branch = qr_token.branch
	attendance.check_in_time = now

	roster = Roster.objects.filter(employee=employee, date=today).select_related('shift').first()
	if roster and roster.shift:
		shift_start = timezone.make_aware(datetime.combine(today, roster.shift.start_time))
		grace = timedelta(minutes=roster.shift.grace_minutes)
		if now > shift_start + grace:
			attendance.status = Attendance.Status.LATE

	attendance.updated_by = request.user
	attendance.save()

	serializer = AttendanceListSerializer(attendance)
	return Response(serializer.data, status=status.HTTP_200_OK)




@extend_schema(request=None, responses=AttendanceListSerializer)
@api_view(['POST'])
@permission_classes([IsAuthenticated])
def checkOut(request):
	token = request.data.get('token')
	if not token:
		return Response({'detail': 'token is required'}, status=status.HTTP_400_BAD_REQUEST)

	try:
		AttendanceQRToken.objects.get(token=token, is_active=True)
	except ObjectDoesNotExist:
		return Response({'detail': 'Invalid or inactive QR code'}, status=status.HTTP_400_BAD_REQUEST)

	try:
		employee = Employee.objects.get(pk=request.user.pk)
	except ObjectDoesNotExist:
		return Response({'detail': 'Only employees can check out'}, status=status.HTTP_400_BAD_REQUEST)

	today = timezone.localdate()

	try:
		attendance = Attendance.objects.get(employee=employee, date=today)
	except ObjectDoesNotExist:
		return Response({'detail': 'You have not checked in today'}, status=status.HTTP_400_BAD_REQUEST)

	if not attendance.check_in_time:
		return Response({'detail': 'You have not checked in today'}, status=status.HTTP_400_BAD_REQUEST)

	if attendance.check_out_time:
		return Response({'detail': 'Already checked out today'}, status=status.HTTP_400_BAD_REQUEST)

	now = timezone.now()
	attendance.check_out_time = now

	worked_seconds = (now - attendance.check_in_time).total_seconds()
	attendance.worked_hours = round(Decimal(worked_seconds) / Decimal(3600), 2)

	attendance.updated_by = request.user
	attendance.save()

	serializer = AttendanceListSerializer(attendance)
	return Response(serializer.data, status=status.HTTP_200_OK)




@extend_schema(request=None, responses=AttendanceQRTokenSerializer)
@api_view(['GET'])
@permission_classes([IsAdminUser])
def getBranchQRImage(request, branch_id):
	try:
		branch = Branch.objects.get(pk=branch_id)
	except ObjectDoesNotExist:
		return Response({'detail': f"Branch id - {branch_id} does't exists"}, status=status.HTTP_400_BAD_REQUEST)

	qr_token, created = AttendanceQRToken.objects.get_or_create(
		branch=branch,
		defaults={'created_by': request.user}
	)

	img = qrcode.make(qr_token.token)
	buffer = BytesIO()
	img.save(buffer, format='PNG')

	return HttpResponse(buffer.getvalue(), content_type='image/png')




@extend_schema(request=None, responses=AttendanceQRTokenSerializer)
@api_view(['POST'])
@permission_classes([IsAdminUser])
def regenerateBranchQRToken(request, branch_id):
	try:
		qr_token = AttendanceQRToken.objects.get(branch__id=branch_id)
	except ObjectDoesNotExist:
		return Response({'detail': f"No QR token exists for branch id - {branch_id}"}, status=status.HTTP_400_BAD_REQUEST)

	qr_token.updated_by = request.user
	qr_token.regenerate()

	serializer = AttendanceQRTokenSerializer(qr_token)
	return Response(serializer.data, status=status.HTTP_200_OK)




@extend_schema(request=AttendanceSerializer, responses=AttendanceSerializer)
@api_view(['PUT'])
@permission_classes([IsAdminUser])
def updateAttendance(request, pk):
	data = request.data

	try:
		attendance = Attendance.objects.get(pk=pk)
	except ObjectDoesNotExist:
		return Response({'detail': f"Attendance id - {pk} doesn't exists"}, status=status.HTTP_400_BAD_REQUEST)

	serializer = AttendanceSerializer(attendance, data=data)
	if serializer.is_valid():
		serializer.save()
		return Response(serializer.data, status=status.HTTP_200_OK)
	else:
		return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)




@extend_schema(request=AttendanceSerializer, responses=AttendanceSerializer)
@api_view(['DELETE'])
@permission_classes([IsAdminUser])
def deleteAttendance(request, pk):
	try:
		attendance = Attendance.objects.get(pk=pk)
		attendance.delete()
		return Response({'detail': f'Attendance id - {pk} is deleted successfully'}, status=status.HTTP_200_OK)
	except ObjectDoesNotExist:
		return Response({'detail': f"Attendance id - {pk} does't exists"}, status=status.HTTP_400_BAD_REQUEST)
