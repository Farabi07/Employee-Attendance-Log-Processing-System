from django.core.exceptions import ObjectDoesNotExist
from django.db.models.fields.related import ManyToManyField

from rest_framework import status
from rest_framework.decorators import api_view, permission_classes, parser_classes
from rest_framework.parsers import JSONParser, MultiPartParser, FormParser
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response

from drf_spectacular.utils import  extend_schema, OpenApiParameter

from authentication.decorators import has_permissions

from site_settings.models import HomePageSlider
from site_settings.serializers import HomePageSliderSerializer, HomePageSliderListSerializer

from commons.pagination import Pagination
from commons.enums import PermissionEnum

import datetime




# Create your views here.

@extend_schema(
	parameters=[
		OpenApiParameter("page"),
		OpenApiParameter("size"),
  ],
	request=HomePageSliderListSerializer,
	responses=HomePageSliderListSerializer
)
@api_view(['GET'])
# @permission_classes([IsAuthenticated])
# @has_permissions([PermissionEnum.ATTRIBUTE_LIST.name])
def getAllHomePageSlider(request):
	homepage_sliders = HomePageSlider.objects.all()
	total_elements = homepage_sliders.count()

	page = request.query_params.get('page')
	size = request.query_params.get('size')

	# Pagination
	pagination = Pagination()
	pagination.page = page
	pagination.size = size
	homepage_sliders = pagination.paginate_data(homepage_sliders)

	serializer = HomePageSliderListSerializer(homepage_sliders, many=True)

	response = {
		'homepage_sliders': serializer.data,
		'page': pagination.page,
		'size': pagination.size,
		'total_pages': pagination.total_pages,
		'total_elements': total_elements,
	}

	return Response(response, status=status.HTTP_200_OK)




@extend_schema(request=HomePageSliderSerializer, responses=HomePageSliderSerializer)
@api_view(['GET'])
# @permission_classes([IsAuthenticated])
# @has_permissions([PermissionEnum.ATTRIBUTE_DETAILS.name])
def getAHomePageSlider(request, pk):
	try:
		homepage_slider = HomePageSlider.objects.get(pk=pk)
		serializer = HomePageSliderSerializer(homepage_slider)
		return Response(serializer.data, status=status.HTTP_200_OK)
	except ObjectDoesNotExist:
		return Response({'detail': f"HomePageSlider id - {pk} does't exists"}, status=status.HTTP_400_BAD_REQUEST)




@extend_schema(request=HomePageSliderSerializer, responses=HomePageSliderSerializer)
@api_view(['POST'])
@permission_classes([IsAuthenticated])
# @has_permissions([PermissionEnum.ATTRIBUTE_CREATE.name])
def createHomePageSlider(request):
	data = request.data
	print('data: ', data)
	print('content_type: ', request.content_type)

	filtered_data = {}

	for key, value in data.items():
		if value != '' and value != '0':
			filtered_data[key] = value
	
	print('filtered_data: ', filtered_data)
	
	serializer = HomePageSliderSerializer(data=filtered_data)

	if serializer.is_valid():
		serializer.save()
		return Response(serializer.data)
	else:
		return Response(serializer.errors)




@extend_schema(request=HomePageSliderSerializer, responses=HomePageSliderSerializer)
@api_view(['PUT'])
@permission_classes([IsAuthenticated])
# @has_permissions([PermissionEnum.ATTRIBUTE_UPDATE.name])
def updateHomePageSlider(request, pk):
	data = request.data
	filtered_data = {}

	try:
		homepage_slider_obj = HomePageSlider.objects.get(pk=pk)
	except ObjectDoesNotExist:
		return Response({'detail': f"HomePageSlider id - {pk} doesn't exists"})

	for key, value in data.items():
		if value != '' and value != '0':
			filtered_data[key] = value

	print('filtered_data: ', filtered_data)

	image = filtered_data.get('image', None)

	if image is not None and type(image) == str:
		popped_image = filtered_data.pop('image')
	
	serializer = HomePageSliderSerializer(homepage_slider_obj, data=filtered_data)
	if serializer.is_valid():
		serializer.save()
		return Response(serializer.data, status=status.HTTP_200_OK)
	else:
		return Response(serializer.errors)
	




@extend_schema(request=HomePageSliderSerializer, responses=HomePageSliderSerializer)
@api_view(['DELETE'])
@permission_classes([IsAuthenticated])
# @has_permissions([PermissionEnum.ATTRIBUTE_DELETE.name])
def deleteHomePageSlider(request, pk):
	try:
		homepage_slider = HomePageSlider.objects.get(pk=pk)
		homepage_slider.delete()
		return Response({'detail': f'HomePageSlider id - {pk} is deleted successfully'}, status=status.HTTP_200_OK)
	except ObjectDoesNotExist:
		return Response({'detail': f"HomePageSlider id - {pk} does't exists"}, status=status.HTTP_400_BAD_REQUEST)


