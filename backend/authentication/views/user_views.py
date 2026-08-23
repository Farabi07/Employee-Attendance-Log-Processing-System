# from _typeshed import ReadableBuffer
from django.contrib.auth import get_user_model
from django.contrib.auth.hashers import make_password
from django.core.exceptions import ObjectDoesNotExist
from django.http import HttpResponse
from django.shortcuts import render
from django.utils import timezone
from django.db.models import Q

from rest_framework import serializers, status
from rest_framework import response
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework_simplejwt.serializers import TokenObtainPairSerializer
from rest_framework_simplejwt.views import TokenObtainPairView

from drf_spectacular.utils import OpenApiParameter, extend_schema

from authentication.decorators import has_permissions
from authentication.models import Permission
from authentication.serializers import (AdminUserSerializer, PasswordChangeSerializer, AdminUserListSerializer)
from authentication.filters import UserFilter

from utils.login_logout import get_all_logged_in_users

from commons.enums import PermissionEnum
from commons.pagination import Pagination




# Create your views here.
User = get_user_model()


class MyTokenObtainPairSerializer(TokenObtainPairSerializer):
	def validate(self, attrs):
		data = super().validate(attrs)

		# data['username'] = self.user.username
		# data['email'] = self.user.email

		serializer = AdminUserListSerializer(self.user).data

		for k, v in serializer.items():
			data[k] = v

		# data.pop('refresh')
		# data.pop('access')
		return data





class MyTokenObtainPairView(TokenObtainPairView):
	serializer_class = MyTokenObtainPairSerializer

	print('mytoken obtain view')
	def f():
		print('mytoken obtain view')
		pass



@extend_schema(
	parameters=[
		OpenApiParameter("page"),
		OpenApiParameter("size"),
  ],
	request=AdminUserSerializer,
	responses=AdminUserSerializer
)
@api_view(['GET'])
# @permission_classes([IsAuthenticated])
# @has_permissions([PermissionEnum.PERMISSION_LIST.name])
def getAllUser(request):
	users = User.objects.all()
	total_elements = users.count()

	page = request.query_params.get('page')
	size = request.query_params.get('size')

	# Pagination
	pagination = Pagination()
	pagination.page = page
	pagination.size = size
	users = pagination.paginate_data(users)

	serializer = AdminUserListSerializer(users, many=True)

	response = {
		'users': serializer.data,
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
	request=AdminUserSerializer,
	responses=AdminUserSerializer
)
@api_view(['GET'])
# @permission_classes([IsAuthenticated])
# @has_permissions([PermissionEnum.PERMISSION_LIST.name])
def getAllUserWithLoggedInStatus(request):
	users = User.objects.all()
	total_elements = users.count()

	logged_in_user_ids = get_all_logged_in_users()

	page = request.query_params.get('page')
	size = request.query_params.get('size')

	# Pagination
	pagination = Pagination()
	pagination.page = page
	pagination.size = size
	users = pagination.paginate_data(users)

	serializer = AdminUserListSerializer(users, many=True)

	response = {
		'users': serializer.data,
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
	request=AdminUserSerializer,
	responses=AdminUserSerializer
)
@api_view(['GET'])
# @permission_classes([IsAuthenticated])
# @has_permissions([PermissionEnum.PERMISSION_LIST.name])
def getAllUserWithoutPagination(request):
	users = User.objects.all()

	serializer = AdminUserListSerializer(users, many=True)

	return Response({'users': serializer.data}, status=status.HTTP_200_OK)




@extend_schema(request=AdminUserSerializer, responses=AdminUserSerializer)
@api_view(['GET'])
# @permission_classes([IsAuthenticated])
# @has_permissions([PermissionEnum.USER_DETAILS.name])
def getAUser(request, pk):
	try:
		user = User.objects.get(pk=pk)
		serializer = AdminUserSerializer(user)
		return Response(serializer.data)
	except ObjectDoesNotExist:
		return Response({'detail': f"User id - {pk} doesn't exists"})




@extend_schema(request=AdminUserListSerializer, responses=AdminUserListSerializer)
@api_view(['GET'])
# @permission_classes([IsAuthenticated])
# @has_permissions([PermissionEnum.PERMISSION_DETAILS_VIEW.name])
def searchUser(request):
	users = UserFilter(request.GET, queryset=User.objects.all())
	users = users.qs

	print('searched_products: ', users)

	total_elements = users.count()

	page = request.query_params.get('page')
	size = request.query_params.get('size')

	# Pagination
	pagination = Pagination()
	pagination.page = page
	pagination.size = size
	users = pagination.paginate_data(users)

	serializer = AdminUserListSerializer(users, many=True)

	response = {
		'users': serializer.data,
		'page': pagination.page,
		'size': pagination.size,
		'total_pages': pagination.total_pages,
		'total_elements': total_elements,
	}

	if len(users) > 0:
		return Response(response, status=status.HTTP_200_OK)
	else:
		return Response({'detail': f"There are no users matching your search"}, status=status.HTTP_400_BAD_REQUEST)




@extend_schema(request=AdminUserSerializer, responses=AdminUserSerializer)
@api_view(['POST'])
# @permission_classes([IsAuthenticated])
# @has_permissions([PermissionEnum.USER_CREATE.name])
def createUser(request):
	data = request.data

	current_datetime = timezone.now()
	current_datetime = str(current_datetime)
	print('current_datetime str: ', current_datetime)

	user_data_dict = {}

	for key, value in data.items():
		user_data_dict[key] = value
		
	user_data_dict['last_login'] = current_datetime

	print('user_data_dict: ', user_data_dict)

	serializer = AdminUserSerializer(data=user_data_dict, many=False)
	
	if serializer.is_valid():
		serializer.save()
		return Response(serializer.data, status=status.HTTP_201_CREATED)
	else:
		return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)




@extend_schema(request=AdminUserSerializer, responses=AdminUserSerializer)
@api_view(['PUT'])
@permission_classes([IsAuthenticated])
# @has_permissions([PermissionEnum.USER_UPDATE.name, PermissionEnum.USER_PARTIAL_UPDATE.name])
def updateUser(request, pk):
	try:
		user = User.objects.get(pk=pk)
		data = request.data
		serializer = AdminUserSerializer(user, data=data, partial=True)
		if serializer.is_valid():
			serializer.save()
			return Response(serializer.data, status=status.HTTP_200_OK)
		else:
			return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
	except ObjectDoesNotExist:
		return Response({'detail': f"User id - {pk} doesn't exists"})




@extend_schema(
	parameters=[
		OpenApiParameter("permission"),

  ],
	request=AdminUserSerializer,
	responses=AdminUserSerializer
)
@api_view(['GET'])
@permission_classes([IsAuthenticated])
# @has_permissions([PermissionEnum.USER_UPDATE.name, PermissionEnum.USER_PARTIAL_UPDATE.name])
def userHasPermission(request):
	permission_param = request.query_params.get('permission')
	user = request.user

	try:
		permission = Permission.objects.get(name=permission_param)
	except:
		response = {'detail': f"There is no such permission named '{permission_param}'."}
		return Response(response, status=status.HTTP_400_BAD_REQUEST)


	get_permission = user.role.permissions.get(pk=permission.id)

	if get_permission:
		return Response({'permission': True}, status=status.HTTP_200_OK)
	else:
		response = {'detail': f"Pemission denied! this user has no '{permission_param}' permission."}
		return Response(response, status=status.HTTP_400_BAD_REQUEST)




@extend_schema(request=PasswordChangeSerializer)
@api_view(['PATCH'])
def userPasswordChange(request, pk):
	try:
		user = User.objects.get(pk=pk)
		data = request.data
		password = data['password']
		confirm_password = data['confirm_password']
		response = ''

		if password == confirm_password:
			user.password = make_password(password)
			user.save()
			response = {'detail': f"User Id - {pk}'s password has been changed successfully."}
			return Response(response, status=status.HTTP_200_OK)
		else:
			response = {'detail': f"Password does not match."}
			return Response(response, status=status.HTTP_400_BAD_REQUEST)
	except ObjectDoesNotExist:
		response = {'detail': f"User id - {pk} doesn't exists"}
		return Response(response, status=status.HTTP_400_BAD_REQUEST)




@api_view(['POST'])
def userImageUpload(request, pk):
	try:
		user = User.objects.get(pk=pk)
		data = request.data
		# image = 

		if 'image' in data:
			print( "================>" ,data, data['image'], type(data['image']))
			user.image = data['image']
			user.save()
			return Response(user.image.url, status=status.HTTP_200_OK)
		else:
			response = {'detail': f"Please upload a valid image"}
			return Response(response, status=status.HTTP_400_BAD_REQUEST)
	except ObjectDoesNotExist:
		response = {'detail': f"User id - {pk} doesn't exists"}
		return Response(response, status=status.HTTP_400_BAD_REQUEST)




@extend_schema(request=AdminUserSerializer, responses=AdminUserSerializer)
@api_view(['DELETE'])
@permission_classes([IsAuthenticated])
@has_permissions([PermissionEnum.USER_DELETE.name])
def deleteUser(request, pk):
	try:
		user = User.objects.get(pk=pk)
		user.delete()
		return Response({'detail': f'User id - {pk} is deleted successfully'}, status=status.HTTP_200_OK)
	except ObjectDoesNotExist:
		return Response({'detail': f"User id - {pk} doesn't exists"}, status=status.HTTP_400_BAD_REQUEST)






@extend_schema(request=AdminUserSerializer, responses=AdminUserSerializer)
@api_view(['GET'])
# @permission_classes([IsAuthenticated])
# @has_permissions([PermissionEnum.USER_DELETE.name])
def checkUsernameWhenCreate(request):

	username = request.query_params.get('username', None)
	print('username: ', username)
	print('type of username: ', type(username))

	response_data = {}

	if username is not None:
		user_objs = User.objects.filter(username=username)
	else:
		return Response({'detail': "Username can't be null."})

	if len(user_objs) > 0:
		response_data['username_exists'] = True
	else:
		response_data['username_exists'] = False
	
	return Response(response_data)




@extend_schema(request=AdminUserSerializer, responses=AdminUserSerializer)
@api_view(['GET'])
# @permission_classes([IsAuthenticated])
# @has_permissions([PermissionEnum.USER_DELETE.name])
def checkUsernameWhenUpdate(request):

	username = request.query_params.get('username', None)
	user = request.query_params.get('user', None)

	response_data = {}

	if username is not None:
		user_names_list = User.objects.filter(username=username).values_list('username', flat=True)
		print('user_names_list: ', user_names_list)
	else:
		return Response({'detail': "Username can't be null."})

	if user is not None:
		user_obj = User.objects.get(pk=int(user))
	else:
		return Response({'detail': "User can't be null."})

	if username == user_obj.username:
		response_data['username_exists'] = False

	elif username in user_names_list:
		response_data['username_exists'] = True
	else:
		response_data['username_exists'] = False
	
	return Response(response_data)



	
@extend_schema(request=AdminUserSerializer, responses=AdminUserSerializer)
@api_view(['GET'])
# @permission_classes([IsAuthenticated])
# @has_permissions([PermissionEnum.USER_DELETE.name])
def checkEmailWhenCreate(request):

	email = request.query_params.get('email', None)
	response_data = {}

	if email is not None:
		user_objs = User.objects.filter(email=email)
	else:
		return Response({'detail': "Email can't be null."})

	if len(user_objs) > 0:
		response_data['email_exists'] = True
	else:
		response_data['email_exists'] = False
	
	return Response(response_data)




@extend_schema(request=AdminUserSerializer, responses=AdminUserSerializer)
@api_view(['GET'])
# @permission_classes([IsAuthenticated])
# @has_permissions([PermissionEnum.USER_DELETE.name])
def checkEmailWhenUpdate(request):

	email = request.query_params.get('email', None)
	user = request.query_params.get('user', None)

	response_data = {}

	if email is not None:
		emails_list = User.objects.filter(email=email).values_list('email', flat=True)
		print('emails_list: ', emails_list)
	else:
		return Response({'detail': "Email can't be null."})

	if user is not None:
		user_obj = User.objects.get(pk=int(user))
	else:
		return Response({'detail': "User can't be null."})

	if email == user_obj.email:
		response_data['email_exists'] = False

	elif email in emails_list:
		response_data['email_exists'] = True
	else:
		response_data['email_exists'] = False
	
	return Response(response_data)




	
@extend_schema(request=AdminUserSerializer, responses=AdminUserSerializer)
@api_view(['GET'])
# @permission_classes([IsAuthenticated])
# @has_permissions([PermissionEnum.USER_DELETE.name])
def checkPrimaryPhoneWhenCreate(request):

	_primary_phone = request.query_params.get('primary_phone', None)
	_primary_phone =  str(_primary_phone).replace(' ', '')
	primary_phone = '+' + _primary_phone
	print('_primary_phone:', _primary_phone)
	print('primary_phone:', primary_phone)

	response_data = {}

	if _primary_phone is not None:
		user_objs = User.objects.filter(Q(primary_phone=primary_phone) | Q(secondary_phone=primary_phone))
		print('user_objs: ', user_objs)
	else:
		return Response({'detail': "Primary phone number can't be null."})

	if len(user_objs) > 0:
		response_data['primary_phone_exists'] = True
	else:
		response_data['primary_phone_exists'] = False
	
	return Response(response_data)




@extend_schema(request=AdminUserSerializer, responses=AdminUserSerializer)
@api_view(['GET'])
# @permission_classes([IsAuthenticated])
# @has_permissions([PermissionEnum.USER_DELETE.name])
def checkPrimaryPhoneWhenUpdate(request):

	_primary_phone = request.query_params.get('primary_phone', None)
	_primary_phone =  str(_primary_phone).replace(' ', '')
	primary_phone = '+' + _primary_phone
	print('_primary_phone:', _primary_phone)
	print('primary_phone:', primary_phone)

	user = request.query_params.get('user', None)

	response_data = {}

	primary_phones_list = []
	if _primary_phone is not None:
		_primary_phones_list = User.objects.filter(Q(primary_phone=primary_phone) | Q(secondary_phone=primary_phone)).values_list('primary_phone', 'secondary_phone')
		print('primary_phones_list: ', _primary_phones_list)
		for tup in _primary_phones_list:
			for t in tup:
				primary_phones_list.append(t)
	else:
		return Response({'detail': "Primary phone can't be null."})
	print('primary_phones_list: ', primary_phones_list)

	if user is not None:
		user_obj = User.objects.get(pk=int(user))
	else:
		return Response({'detail': "User can't be null."})

	if primary_phone == user_obj.primary_phone:
		response_data['primary_phone_exists'] = False

	elif primary_phone in primary_phones_list:
		response_data['primary_phone_exists'] = True
	else:
		response_data['primary_phone_exists'] = False
	
	return Response(response_data)



	
@extend_schema(request=AdminUserSerializer, responses=AdminUserSerializer)
@api_view(['GET'])
# @permission_classes([IsAuthenticated])
# @has_permissions([PermissionEnum.USER_DELETE.name])
def checkSecondaryPhoneWhenCreate(request):

	_secondary_phone = request.query_params.get('secondary_phone', None)
	_secondary_phone = str(_secondary_phone).replace(' ', '')
	secondary_phone = '+' + _secondary_phone
	print('_secondary_phone:', _secondary_phone)
	print('secondary_phone:', secondary_phone)

	response_data = {}

	if _secondary_phone is not None:
		user_objs = User.objects.filter(Q(primary_phone=secondary_phone) | Q(secondary_phone=secondary_phone))
	else:
		return Response({'detail': "Secondary phone number can't be null."})

	if len(user_objs) > 0:
		response_data['secondary_phone_exists'] = True
	else:
		response_data['secondary_phone_exists'] = False
	
	return Response(response_data)
	



@extend_schema(request=AdminUserSerializer, responses=AdminUserSerializer)
@api_view(['GET'])
# @permission_classes([IsAuthenticated])
# @has_permissions([PermissionEnum.USER_DELETE.name])
def checkSecondaryPhoneWhenUpdate(request):

	_secondary_phone = request.query_params.get('secondary_phone', None)
	_secondary_phone = str(_secondary_phone).replace(' ', '')
	secondary_phone = '+' + _secondary_phone
	print('_secondary_phone:', _secondary_phone)
	print('secondary_phone:', secondary_phone)

	user = request.query_params.get('user', None)

	response_data = {}

	secondary_phones_list = []
	if _secondary_phone is not None:
		_secondary_phones_list = User.objects.filter(Q(primary_phone=secondary_phone) | Q(secondary_phone=secondary_phone)).values_list('primary_phone', 'secondary_phone')
		print('secondary_phones_list: ', _secondary_phones_list)
		for tup in _secondary_phones_list:
			print('tup: ', tup)
			for t in tup:
				print('t: ', t)
				secondary_phones_list.append(t)
	else:
		return Response({'detail': "Secondary phone can't be null."})

	print('secondary_phones_list: ', secondary_phones_list)

	if user is not None:
		user_obj = User.objects.get(pk=int(user))
	else:
		return Response({'detail': "User can't be null."})

	if secondary_phone == user_obj.secondary_phone or secondary_phone == user_obj.primary_phone:
		response_data['secondary_phone_exists'] = False

	elif secondary_phone in secondary_phones_list:
		response_data['secondary_phone_exists'] = True
	else:
		response_data['secondary_phone_exists'] = False
	
	return Response(response_data)
	
	