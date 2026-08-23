from django.core.exceptions import ObjectDoesNotExist

from rest_framework import serializers, status
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response

from drf_spectacular.utils import extend_schema, OpenApiParameter

from authentication.decorators import has_permissions
from authentication.models import Qualification
from authentication.serializers import QualificationSerializer, QualificationListSerializer
from authentication.filters import QualificationFilter

from commons.enums import PermissionEnum
from commons.pagination import Pagination




# Create your views here.

@extend_schema(
	parameters=[
		OpenApiParameter("page"),
		OpenApiParameter("size"),
  ],
	request=QualificationSerializer,
	responses=QualificationSerializer
)
@api_view(['GET'])
# @permission_classes([IsAuthenticated])
# @has_permissions([PermissionEnum.PERMISSION_LIST_VIEW.name])
def getAllQualification(request):
	qualifications = Qualification.objects.all()
	total_elements = qualifications.count()

	page = request.query_params.get('page')
	size = request.query_params.get('size')

	# Pagination
	pagination = Pagination()
	pagination.page = page
	pagination.size = size
	qualifications = pagination.paginate_data(qualifications)

	serializer = QualificationListSerializer(qualifications, many=True)

	response = {
		'qualifications': serializer.data,
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
	request=QualificationSerializer,
	responses=QualificationSerializer
)
@api_view(['GET'])
# @permission_classes([IsAuthenticated])
# @has_permissions([PermissionEnum.PERMISSION_LIST_VIEW.name])
def getAllQualificationWithoutPagination(request):
	qualifications = Qualification.objects.all()

	serializer = QualificationListSerializer(qualifications, many=True)

	return Response({'qualifications': serializer.data}, status=status.HTTP_200_OK)




@extend_schema(request=QualificationSerializer, responses=QualificationSerializer)
@api_view(['GET'])
# @permission_classes([IsAuthenticated])
# @has_permissions([PermissionEnum.PERMISSION_DETAILS_VIEW.name])
def getAQualification(request, pk):
	try:
		qualification = Qualification.objects.get(pk=pk)
		serializer = QualificationSerializer(qualification)
		return Response(serializer.data, status=status.HTTP_200_OK)
	except ObjectDoesNotExist:
		return Response({'detail': f"Qualification id - {pk} doesn't exists"}, status=status.HTTP_400_BAD_REQUEST)




@extend_schema(request=QualificationSerializer, responses=QualificationSerializer)
@api_view(['GET'])
# @permission_classes([IsAuthenticated])
# @has_permissions([PermissionEnum.PRODUCT_DETAILS.name])
def searchQualification(request):

	qualifications = QualificationFilter(request.GET, queryset=Qualification.objects.all())
	qualifications = qualifications.qs

	print('qualifications: ', qualifications)

	total_elements = qualifications.count()

	page = request.query_params.get('page')
	size = request.query_params.get('size')

	# Pagination
	pagination = Pagination()
	pagination.page = page
	pagination.size = size
	qualifications = pagination.paginate_data(qualifications)

	serializer = QualificationListSerializer(qualifications, many=True)

	response = {
		'qualifications': serializer.data,
		'page': pagination.page,
		'size': pagination.size,
		'total_pages': pagination.total_pages,
		'total_elements': total_elements,
	}

	if len(qualifications) > 0:
		return Response(response, status=status.HTTP_200_OK)
	else:
		return Response({'detail': f"There are no qualifications matching your search"}, status=status.HTTP_400_BAD_REQUEST)




@extend_schema(request=QualificationSerializer, responses=QualificationSerializer)
@api_view(['POST'])
@permission_classes([IsAuthenticated])
# @has_permissions([PermissionEnum.PERMISSION_CREATE.name])
def createQualification(request):
	data = request.data
	filtered_data = {}

	for key, value in data.items():
		if value != '' and value != 0 and value != '0':
			filtered_data[key] = value

	print('data: ', data)
	print('filtered_data: ', filtered_data)

	serializer = QualificationSerializer(data=filtered_data)

	if serializer.is_valid():
		serializer.save()
		return Response(serializer.data, status=status.HTTP_201_CREATED)
	else:
		return Response(serializer.errors)




@extend_schema(request=QualificationSerializer, responses=QualificationSerializer)
@api_view(['PUT'])
@permission_classes([IsAuthenticated])
# @has_permissions([PermissionEnum.PERMISSION_UPDATE.name, PermissionEnum.PERMISSION_PARTIAL_UPDATE.name])
def updateQualification(request,pk):
	data = request.data

	print('data: ', data)
	print('request.content_type: ', request.content_type)

	qualification_dict = {}

	for key, value in data.items():
		if 'image_doc' in key and type(value) == str:
			pass
		else:
			qualification_dict[key] = value
		
	print('qualification_dict: ', qualification_dict)

	try:
		qualification = Qualification.objects.get(pk=pk)

		serializer = QualificationSerializer(qualification, data=qualification_dict)
		if serializer.is_valid():
			serializer.save()
			return Response(serializer.data, status=status.HTTP_200_OK)
		else:
			return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
	except ObjectDoesNotExist:
		return Response({'detail': f"Qualification id - {pk} doesn't exists"}, status=status.HTTP_400_BAD_REQUEST)




@extend_schema(request=QualificationSerializer, responses=QualificationSerializer)
@api_view(['DELETE'])
@permission_classes([IsAuthenticated])
# @has_permissions([PermissionEnum.PERMISSION_DELETE.name])
def deleteQualification(request, pk):
	try:
		qualification = Qualification.objects.get(pk=pk)
		qualification.delete()
		return Response({'detail': f'Qualification id - {pk} is deleted successfully'}, status=status.HTTP_200_OK)
	except ObjectDoesNotExist:
		return Response({'detail': f"Qualification id - {pk} doesn't exists"}, status=status.HTTP_400_BAD_REQUEST)

