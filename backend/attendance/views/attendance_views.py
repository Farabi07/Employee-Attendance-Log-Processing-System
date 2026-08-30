from datetime import datetime, timedelta
from decimal import Decimal
from io import BytesIO

import qrcode

from django.core.exceptions import ObjectDoesNotExist
from django.http import HttpResponse
from django.utils import timezone

from rest_framework import status
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response

from drf_spectacular.utils import extend_schema, OpenApiParameter

from authentication.models import Branch, Employee
from authentication.permissions import IsManagerOrModerator, CanManageQr, HasActiveSubscription

from attendance.models import Attendance, AttendanceQRToken, Roster, QR_CODE_PERIOD_SECONDS
from attendance.serializers import AttendanceSerializer, AttendanceListSerializer, AttendanceQRTokenSerializer
from attendance.filters import AttendanceFilter
from attendance.geo import distance_meters
from attendance.reports import build_report_rows
from attendance.exporters import render_pdf, render_excel
from attendance.absentee import mark_absent_for_date

from commons.pagination import Pagination




# Create your views here.

def _shift_scheduled_hours(shift):
	"""Duration of a shift in hours, handling ones that cross midnight
	(end_time earlier than start_time means it runs into the next day)."""
	start_minutes = shift.start_time.hour * 60 + shift.start_time.minute
	end_minutes = shift.end_time.hour * 60 + shift.end_time.minute
	if end_minutes <= start_minutes:
		end_minutes += 24 * 60
	return Decimal(end_minutes - start_minutes) / Decimal(60)


def _validate_location(request, qr_token):
	"""Returns (lat, lon, error_response). error_response is None when OK to proceed."""
	lat = request.data.get('lat')
	lon = request.data.get('lon')

	if not qr_token.geofence_enabled:
		return lat, lon, None

	if lat is None or lon is None:
		return None, None, Response(
			{'detail': 'Location is required to check in/out at this branch'},
			status=status.HTTP_400_BAD_REQUEST
		)

	try:
		dist = distance_meters(qr_token.latitude, qr_token.longitude, lat, lon)
	except (TypeError, ValueError):
		return None, None, Response({'detail': 'Invalid location data'}, status=status.HTTP_400_BAD_REQUEST)

	if dist > qr_token.allowed_radius_meters:
		return None, None, Response(
			{'detail': f'You are {int(dist)}m away from the office — outside the allowed {qr_token.allowed_radius_meters}m radius'},
			status=status.HTTP_400_BAD_REQUEST
		)

	return lat, lon, None


def _resolve_qr_token_by_code(organization, code):
	"""A scanned code is a live TOTP value, not a lookup key — it doesn't
	identify a branch by itself. Check it against every active QR token in
	the employee's organization (there are only ever a handful of branches
	per store) and return the one it's currently valid for."""
	for qr_token in AttendanceQRToken.objects.filter(branch__organization=organization, is_active=True).select_related('branch'):
		if qr_token.verify_code(code):
			return qr_token
	return None




@extend_schema(
	parameters=[
		OpenApiParameter("page"),
		OpenApiParameter("size"),
  ],
	request=AttendanceListSerializer,
	responses=AttendanceListSerializer
)
@api_view(['GET'])
@permission_classes([IsManagerOrModerator, HasActiveSubscription])
def getAllAttendance(request):
	attendances = Attendance.objects.filter(employee__organization=request.user.organization)
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
@permission_classes([IsManagerOrModerator, HasActiveSubscription])
def getAllAttendanceWithoutPagination(request):
	attendances = Attendance.objects.filter(employee__organization=request.user.organization)

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
@permission_classes([IsManagerOrModerator, HasActiveSubscription])
def searchAttendance(request):
	attendances = AttendanceFilter(request.GET, queryset=Attendance.objects.filter(employee__organization=request.user.organization))
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
@permission_classes([IsAuthenticated, HasActiveSubscription])
def getAllAttendanceByEmployeeId(request, employee_id):
	attendances = Attendance.objects.filter(employee__id=employee_id, employee__organization=request.user.organization)
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
@permission_classes([IsAuthenticated, HasActiveSubscription])
def getAAttendance(request, pk):
	try:
		attendance = Attendance.objects.get(pk=pk, employee__organization=request.user.organization)
		serializer = AttendanceListSerializer(attendance)
		return Response(serializer.data, status=status.HTTP_200_OK)
	except ObjectDoesNotExist:
		return Response({'detail': f"Attendance id - {pk} does't exists"}, status=status.HTTP_400_BAD_REQUEST)




@extend_schema(request=AttendanceListSerializer, responses=AttendanceListSerializer)
@api_view(['GET'])
@permission_classes([IsAuthenticated, HasActiveSubscription])
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
@permission_classes([IsAuthenticated, HasActiveSubscription])
def checkIn(request):
	code = request.data.get('token') or request.data.get('code')
	if not code:
		return Response({'detail': 'code is required'}, status=status.HTTP_400_BAD_REQUEST)

	try:
		employee = Employee.objects.get(pk=request.user.pk)
	except ObjectDoesNotExist:
		return Response({'detail': 'Only employees can check in'}, status=status.HTTP_400_BAD_REQUEST)

	qr_token = _resolve_qr_token_by_code(employee.organization, code)
	if qr_token is None:
		return Response({'detail': 'This code is invalid or has expired — scan the current QR on screen'}, status=status.HTTP_400_BAD_REQUEST)

	lat, lon, error = _validate_location(request, qr_token)
	if error:
		return error

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
	attendance.check_in_lat = lat
	attendance.check_in_lon = lon

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
@permission_classes([IsAuthenticated, HasActiveSubscription])
def checkOut(request):
	code = request.data.get('token') or request.data.get('code')
	if not code:
		return Response({'detail': 'code is required'}, status=status.HTTP_400_BAD_REQUEST)

	try:
		employee = Employee.objects.get(pk=request.user.pk)
	except ObjectDoesNotExist:
		return Response({'detail': 'Only employees can check out'}, status=status.HTTP_400_BAD_REQUEST)

	qr_token = _resolve_qr_token_by_code(employee.organization, code)
	if qr_token is None:
		return Response({'detail': 'This code is invalid or has expired — scan the current QR on screen'}, status=status.HTTP_400_BAD_REQUEST)

	lat, lon, error = _validate_location(request, qr_token)
	if error:
		return error

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
	attendance.check_out_lat = lat
	attendance.check_out_lon = lon

	worked_seconds = (now - attendance.check_in_time).total_seconds()
	attendance.worked_hours = round(Decimal(worked_seconds) / Decimal(3600), 2)

	# Compare against today's scheduled shift (if one was actually rostered)
	# to split worked hours into what's paid automatically (regular, capped
	# at the shift length) versus what's set aside for the employee to
	# claim through a PayAdjustmentRequest (overtime or shortfall).
	roster = Roster.objects.filter(employee=employee, date=today).select_related('shift').first()
	if roster and roster.shift:
		attendance.scheduled_hours = _shift_scheduled_hours(roster.shift)
		regular_hours = min(attendance.worked_hours, attendance.scheduled_hours)
		attendance.overtime_hours = max(Decimal('0'), attendance.worked_hours - attendance.scheduled_hours)
		attendance.shortfall_hours = max(Decimal('0'), attendance.scheduled_hours - attendance.worked_hours)
	else:
		attendance.scheduled_hours = None
		regular_hours = attendance.worked_hours
		attendance.overtime_hours = Decimal('0')
		attendance.shortfall_hours = Decimal('0')

	if employee.hourly_rate is not None:
		attendance.earnings = round(regular_hours * employee.hourly_rate, 2)

	attendance.updated_by = request.user
	attendance.save()

	if attendance.earnings:
		from commons.currencies import CURRENCY_SYMBOLS
		from wallet.models import WalletTransaction
		from wallet.notify import notify_payout_completed

		symbol = CURRENCY_SYMBOLS.get(employee.currency, '$')
		note = f"Worked {regular_hours}h at {symbol}{employee.hourly_rate}/h"
		if attendance.overtime_hours:
			note += f" — {attendance.overtime_hours}h overtime pending your approval request"
		elif attendance.shortfall_hours:
			note += f" — {attendance.shortfall_hours}h short of your {attendance.scheduled_hours}h shift"
		earning = WalletTransaction.objects.create(
			employee=employee,
			organization=employee.organization,
			type=WalletTransaction.Type.EARNING,
			status=WalletTransaction.Status.COMPLETED,
			amount=attendance.earnings,
			related_attendance=attendance,
			note=note,
		)

		if employee.payout_cycle == employee.PayoutCycle.HOURLY:
			from wallet.views.wallet_views import _settle_payout

			payout = WalletTransaction.objects.create(
				employee=employee,
				organization=employee.organization,
				type=WalletTransaction.Type.PAYOUT,
				status=WalletTransaction.Status.PENDING,
				amount=earning.amount,
				note="Instant hourly payout — settled right after check-out",
			)
			payout = _settle_payout(payout)
			if payout.status == WalletTransaction.Status.COMPLETED:
				notify_payout_completed(payout)

	serializer = AttendanceListSerializer(attendance)
	return Response(serializer.data, status=status.HTTP_200_OK)




@extend_schema(request=None, responses=AttendanceQRTokenSerializer)
@api_view(['GET'])
@permission_classes([CanManageQr, HasActiveSubscription])
def getBranchQRImage(request, branch_id):
	try:
		branch = Branch.objects.get(pk=branch_id, organization=request.user.organization)
	except ObjectDoesNotExist:
		return Response({'detail': f"Branch id - {branch_id} does't exists"}, status=status.HTTP_400_BAD_REQUEST)

	qr_token, created = AttendanceQRToken.objects.get_or_create(
		branch=branch,
		defaults={'created_by': request.user}
	)

	img = qrcode.make(qr_token.current_code())
	buffer = BytesIO()
	img.save(buffer, format='PNG')

	response = HttpResponse(buffer.getvalue(), content_type='image/png')
	response['Cache-Control'] = 'no-store'
	return response




@extend_schema(request=None, responses=None)
@api_view(['GET'])
@permission_classes([CanManageQr, HasActiveSubscription])
def getBranchLiveCode(request, branch_id):
	"""JSON form of the live code, for a frontend that renders the QR
	client-side and drives its own countdown — avoids re-fetching a whole
	PNG every few seconds."""
	try:
		branch = Branch.objects.get(pk=branch_id, organization=request.user.organization)
	except ObjectDoesNotExist:
		return Response({'detail': f"Branch id - {branch_id} does't exists"}, status=status.HTTP_400_BAD_REQUEST)

	qr_token, created = AttendanceQRToken.objects.get_or_create(
		branch=branch,
		defaults={'created_by': request.user}
	)

	return Response(
		{
			'code': qr_token.current_code(),
			'seconds_remaining': qr_token.seconds_remaining(),
			'period_seconds': QR_CODE_PERIOD_SECONDS,
			'branch_name': branch.name,
		},
		status=status.HTTP_200_OK,
	)




@extend_schema(request=None, responses=AttendanceQRTokenSerializer)
@api_view(['POST'])
@permission_classes([CanManageQr, HasActiveSubscription])
def regenerateBranchQRToken(request, branch_id):
	try:
		qr_token = AttendanceQRToken.objects.get(branch__id=branch_id, branch__organization=request.user.organization)
	except ObjectDoesNotExist:
		return Response({'detail': f"No QR token exists for branch id - {branch_id}"}, status=status.HTTP_400_BAD_REQUEST)

	qr_token.updated_by = request.user
	qr_token.regenerate()

	serializer = AttendanceQRTokenSerializer(qr_token)
	return Response(serializer.data, status=status.HTTP_200_OK)




@extend_schema(request=AttendanceQRTokenSerializer, responses=AttendanceQRTokenSerializer)
@api_view(['GET', 'PUT'])
@permission_classes([CanManageQr, HasActiveSubscription])
def updateBranchGeofence(request, branch_id):
	try:
		branch = Branch.objects.get(pk=branch_id, organization=request.user.organization)
	except ObjectDoesNotExist:
		return Response({'detail': f"Branch id - {branch_id} does't exists"}, status=status.HTTP_400_BAD_REQUEST)

	qr_token, created = AttendanceQRToken.objects.get_or_create(
		branch=branch,
		defaults={'created_by': request.user}
	)

	if request.method == 'PUT':
		data = request.data
		# allow explicitly clearing the geofence by sending nulls
		qr_token.latitude = data.get('latitude')
		qr_token.longitude = data.get('longitude')
		qr_token.allowed_radius_meters = data.get('allowed_radius_meters')
		qr_token.updated_by = request.user
		qr_token.save()

	serializer = AttendanceQRTokenSerializer(qr_token)
	return Response(serializer.data, status=status.HTTP_200_OK)




@extend_schema(request=AttendanceSerializer, responses=AttendanceSerializer)
@api_view(['PUT'])
@permission_classes([IsManagerOrModerator, HasActiveSubscription])
def updateAttendance(request, pk):
	data = request.data

	try:
		attendance = Attendance.objects.get(pk=pk, employee__organization=request.user.organization)
	except ObjectDoesNotExist:
		return Response({'detail': f"Attendance id - {pk} doesn't exists"}, status=status.HTTP_400_BAD_REQUEST)

	serializer = AttendanceSerializer(attendance, data=data, partial=True)
	if serializer.is_valid():
		serializer.save()
		return Response(serializer.data, status=status.HTTP_200_OK)
	else:
		return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)




@extend_schema(request=AttendanceSerializer, responses=AttendanceSerializer)
@api_view(['DELETE'])
@permission_classes([IsManagerOrModerator, HasActiveSubscription])
def deleteAttendance(request, pk):
	try:
		attendance = Attendance.objects.get(pk=pk, employee__organization=request.user.organization)
		attendance.delete()
		return Response({'detail': f'Attendance id - {pk} is deleted successfully'}, status=status.HTTP_200_OK)
	except ObjectDoesNotExist:
		return Response({'detail': f"Attendance id - {pk} does't exists"}, status=status.HTTP_400_BAD_REQUEST)




def _parse_report_range(request):
	date_from = request.query_params.get('date_from')
	date_to = request.query_params.get('date_to')
	if not date_from or not date_to:
		return None, None, Response({'detail': 'date_from and date_to are required'}, status=status.HTTP_400_BAD_REQUEST)
	try:
		date_from = datetime.strptime(date_from, '%Y-%m-%d').date()
		date_to = datetime.strptime(date_to, '%Y-%m-%d').date()
	except ValueError:
		return None, None, Response({'detail': 'date_from/date_to must be YYYY-MM-DD'}, status=status.HTTP_400_BAD_REQUEST)
	return date_from, date_to, None




@extend_schema(request=None, responses=None)
@api_view(['GET'])
@permission_classes([IsManagerOrModerator, HasActiveSubscription])
def exportAttendancePdf(request):
	date_from, date_to, error = _parse_report_range(request)
	if error:
		return error

	rows = build_report_rows(date_from, date_to, request.user.organization)
	pdf_bytes = render_pdf(rows, date_from, date_to)

	response = HttpResponse(pdf_bytes, content_type='application/pdf')
	response['Content-Disposition'] = f'attachment; filename="attendance-report_{date_from}_to_{date_to}.pdf"'
	return response




@extend_schema(request=None, responses=None)
@api_view(['GET'])
@permission_classes([IsManagerOrModerator, HasActiveSubscription])
def exportAttendanceExcel(request):
	date_from, date_to, error = _parse_report_range(request)
	if error:
		return error

	rows = build_report_rows(date_from, date_to, request.user.organization)
	excel_bytes = render_excel(rows, date_from, date_to)

	response = HttpResponse(excel_bytes, content_type='application/vnd.openxmlformats-officedocument.spreadsheetml.sheet')
	response['Content-Disposition'] = f'attachment; filename="attendance-report_{date_from}_to_{date_to}.xlsx"'
	return response




@extend_schema(request=None, responses=None)
@api_view(['POST'])
@permission_classes([IsManagerOrModerator, HasActiveSubscription])
def runMarkAbsent(request):
	date_str = request.query_params.get('date')
	if date_str:
		try:
			target_date = datetime.strptime(date_str, '%Y-%m-%d').date()
		except ValueError:
			return Response({'detail': 'date must be YYYY-MM-DD'}, status=status.HTTP_400_BAD_REQUEST)
	else:
		target_date = timezone.localdate() - timedelta(days=1)

	marked = mark_absent_for_date(target_date, organization=request.user.organization)
	return Response({'detail': f'Marked {len(marked)} employee(s) absent for {target_date}', 'date': str(target_date), 'count': len(marked)}, status=status.HTTP_200_OK)
