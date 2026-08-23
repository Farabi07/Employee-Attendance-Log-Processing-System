from django.core.exceptions import ObjectDoesNotExist
from django.core.mail import send_mail, BadHeaderError
from django.conf import settings

from rest_framework import status
from rest_framework.decorators import api_view, permission_classes, parser_classes
from rest_framework.parsers import JSONParser, MultiPartParser, FormParser
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response

from drf_spectacular.utils import  extend_schema, OpenApiParameter

from authentication.decorators import has_permissions
from authentication.models import User
from site_settings.models import GeneralSetting

from support.models import Ticket, TicketDepartment, TicketDetail, TicketPriority, TicketStatus
from support.serializers import TicketSerializer, TicketListSerializer

from commons.pagination import Pagination
from commons.enums import PermissionEnum

import datetime




# Create your views here.

@extend_schema(
	parameters=[
		OpenApiParameter("page"),
		OpenApiParameter("size"),
  ],
	request=TicketListSerializer,
	responses=TicketListSerializer
)
@api_view(['GET'])
# @permission_classes([IsAuthenticated])
# @has_permissions([PermissionEnum.ATTRIBUTE_LIST.name])
def getAllTicket(request):
	tickets = Ticket.objects.all()
	total_elements = tickets.count()

	page = request.query_params.get('page')
	size = request.query_params.get('size')

	# Pagination
	pagination = Pagination()
	pagination.page = page
	pagination.size = size
	tickets = pagination.paginate_data(tickets)

	serializer = TicketListSerializer(tickets, many=True)

	response = {
		'tickets': serializer.data,
		'page': pagination.page,
		'size': pagination.size,
		'total_pages': pagination.total_pages,
		'total_elements': total_elements,
	}

	return Response(response, status=status.HTTP_200_OK)




@extend_schema(
	request=TicketListSerializer,
	responses=TicketListSerializer
)
@api_view(['GET'])
# @permission_classes([IsAuthenticated])
# @has_permissions([PermissionEnum.ATTRIBUTE_LIST.name])
def getAllTicketByUserId(request, user_id):
	try:
		user_obj = User.objects.get(pk=user_id)
	except User.DoesNotExist:
		return Response({'detail':f"User id {user_id} doesn't exists."})

	tickets = Ticket.objects.filter(user=user_id)
	total_elements = tickets.count()

	page = request.query_params.get('page')
	size = request.query_params.get('size')

	# Pagination
	pagination = Pagination()
	pagination.page = page
	pagination.size = size
	tickets = pagination.paginate_data(tickets)

	serializer = TicketListSerializer(tickets, many=True)

	response = {
		'tickets': serializer.data,
		'page': pagination.page,
		'size': pagination.size,
		'total_pages': pagination.total_pages,
		'total_elements': total_elements,
	}

	return Response(response, status=status.HTTP_200_OK)




@extend_schema(request=TicketSerializer, responses=TicketSerializer)
@api_view(['GET'])
# @permission_classes([IsAuthenticated])
# @has_permissions([PermissionEnum.ATTRIBUTE_DETAILS.name])
def getATicket(request, pk):
	try:
		ticket = Ticket.objects.get(pk=pk)
		serializer = TicketSerializer(ticket)
		return Response(serializer.data, status=status.HTTP_200_OK)
	except ObjectDoesNotExist:
		return Response({'detail': f"Ticket id - {pk} does't exists"}, status=status.HTTP_400_BAD_REQUEST)




@extend_schema(request=TicketSerializer, responses=TicketSerializer)
@api_view(['POST'])
@permission_classes([IsAuthenticated])
# @has_permissions([PermissionEnum.ATTRIBUTE_CREATE.name])
def createTicket(request):
	data = request.data
	print('data: ', data)
	print('content_type: ', request.content_type)

	filtered_data = {}

	for key, value in data.items():
		if value != '' and value != '0':
			filtered_data[key] = value
	
	print('filtered_data: ', filtered_data)

	name = filtered_data.get('name', None)
	email = to_email = filtered_data.get('email', None)
	subject = email_subject = filtered_data.get('subject', None)
	user = filtered_data.get('user', None)
	ticket_department = filtered_data.get('ticket_department', None)
	ticket_priority = filtered_data.get('ticket_priority', None)
	file = filtered_data.get('file', None)
	message = email_message = filtered_data.get('message', None)

	from_email= settings.EMAIL_HOST_USER
	general_setting_obj = GeneralSetting.objects.latest()
	email_body = f"Hello, {name}.\nYou have made a ticket request at {general_setting_obj.site_name}.\n\nYou have stated your problem as: \n" + str(email_message) + f"\nWe will contact to you soon.\n\nRegards,\n{general_setting_obj.site_name}"

	try:
		customer_obj = user_obj = User.objects.get(pk=user)
	except User.DoesNotExist:
		return Response({'detail': f"User id {user} doesn't exists."})
	try:
		ticket_department_obj = TicketDepartment.objects.get(pk=ticket_department)
	except TicketDepartment.DoesNotExist:
		return Response({'detail': f"TicketDepartment id {ticket_department} doesn't exists."})
	try:
		ticket_priority_obj = TicketPriority.objects.get(pk=ticket_priority)
	except TicketPriority.DoesNotExist:
		return Response({'detail': f"TicketPriority id {ticket_priority} doesn't exists."})

	ticket_status_obj = TicketStatus.objects.get_or_create(name='Open')

	ticket_obj = Ticket.objects.create(subject=subject, user=user_obj, ticket_department=ticket_department_obj, ticket_priority=ticket_priority_obj, ticket_status=ticket_status_obj)

	ticket_detail_obj = TicketDetail.objects.create(ticket=ticket_obj, customer=customer_obj, message=message, file=file)

	try:
		send_mail(email_subject, email_body, from_email, [to_email, ], fail_silently=False, )
		serializer = TicketListSerializer(ticket_obj)

		return Response(serializer.data)

	except BadHeaderError:
		return Response('Invalid header found.')




@extend_schema(request=TicketSerializer, responses=TicketSerializer)
@api_view(['PUT'])
@permission_classes([IsAuthenticated])
# @has_permissions([PermissionEnum.ATTRIBUTE_UPDATE.name])
def updateTicket(request, pk):
	data = request.data
	filtered_data = {}

	try:
		ticket_obj = Ticket.objects.get(pk=pk)
	except ObjectDoesNotExist:
		return Response({'detail': f"Ticket id - {pk} doesn't exists"})

	for key, value in data.items():
		if value != '' and value != '0':
			filtered_data[key] = value

	print('filtered_data: ', filtered_data)

	file = data.get('file', None)

	if file is not None and type(file) == str:
		popped_file = filtered_data.pop('file')
	
	serializer = TicketSerializer(ticket_obj, data=filtered_data)
	if serializer.is_valid():
		serializer.save()
		return Response(serializer.data, status=status.HTTP_200_OK)
	else:
		return Response(serializer.errors)
	



@extend_schema(request=TicketSerializer, responses=TicketSerializer)
@api_view(['DELETE'])
@permission_classes([IsAuthenticated])
# @has_permissions([PermissionEnum.ATTRIBUTE_DELETE.name])
def deleteTicket(request, pk):
	try:
		ticket = Ticket.objects.get(pk=pk)
		ticket.delete()
		return Response({'detail': f'Ticket id - {pk} is deleted successfully'}, status=status.HTTP_200_OK)
	except ObjectDoesNotExist:
		return Response({'detail': f"Ticket id - {pk} does't exists"}, status=status.HTTP_400_BAD_REQUEST)


