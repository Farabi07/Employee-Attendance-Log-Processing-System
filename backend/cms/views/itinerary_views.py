from django.core.exceptions import ObjectDoesNotExist
from django.db import connection
from django.db.models import Q
from django.http import JsonResponse

from rest_framework import status
from rest_framework.decorators import api_view, permission_classes, parser_classes
from rest_framework.parsers import JSONParser, MultiPartParser, FormParser
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response

from drf_spectacular.utils import  extend_schema, OpenApiParameter

from authentication.decorators import has_permissions

from cms.models import CMSMenuContent, CMSMenu,Itinerary
from cms.serializers import ItinerarySerializer, ItineraryListSerializer

from commons.pagination import Pagination
from commons.enums import PermissionEnum

import datetime




# Create your views here.

@extend_schema(
	parameters=[
		OpenApiParameter("page"),
		OpenApiParameter("size"),
  ],
	request=ItineraryListSerializer,
	responses=ItineraryListSerializer
)
@api_view(['GET'])
# @permission_classes([IsAuthenticated])
# @has_permissions([PermissionEnum.ATTRIBUTE_LIST.name])
def getAllItinerary(request):
	menu_items = Itinerary.objects.all()
	total_elements = menu_items.count()

	page = request.query_params.get('page')
	size = request.query_params.get('size')

	# Pagination
	pagination = Pagination()
	pagination.page = page
	pagination.size = size
	menu_items = pagination.paginate_data(menu_items)

	serializer = ItineraryListSerializer(menu_items, many=True)

	response = {
		'menu_items': serializer.data,
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
	request=ItineraryListSerializer,
	responses=ItineraryListSerializer
)
@api_view(['GET'])
# @permission_classes([IsAuthenticated])
# @has_permissions([PermissionEnum.ATTRIBUTE_LIST.name])
def getAllItineraryWithoutPagination(request):
	menu_items = CMSMenuContent.objects.all()

	serializer = ItineraryListSerializer(menu_items, many=True)

	response = {
		'menu_items': serializer.data,
	}
	return Response(response, status=status.HTTP_200_OK)




@extend_schema(
	parameters=[
		OpenApiParameter("page"),
		OpenApiParameter("size"),
  ],
	request=ItineraryListSerializer,
	responses=ItineraryListSerializer
)
@api_view(['GET'])
# @permission_classes([IsAuthenticated])
# @has_permissions([PermissionEnum.ATTRIBUTE_LIST.name])
def getAllItineraryByCMSMenuId(request, menu_id):
	itineraries = Itinerary.objects.filter(cms_content=menu_id)

	serializer = ItineraryListSerializer(itineraries,many=True)
	return Response(serializer.data, status=status.HTTP_200_OK)

	# with connection.cursor() as cursor:
	# 	cursor.execute('''
	# 					SELECT
	# 						cms_menu_id AS cms_menu,
	# 						jsonb_build_object(
	# 			             	'title', MAX(title),
    #                 			'description', MAX(description),
    #                 			'location', MAX(location)
	# 			            ) AS data
	# 					FROM cms_Itinerary WHERE cms_menu_id=%s
	# 					GROUP BY cms_menu_id
	# 					ORDER BY cms_menu_id;
	# 					''', [menu_id])
  
	# 	row = cursor.fetchall()
		
	# if rows:
	# 		my_data = [{'title': row[0],'description':row[1] } for row in rows]
			
	# 		response = {'menu_contents': my_data}
	# 		return JsonResponse(response, status=status.HTTP_200_OK)
		
	# else:
	# 	return JsonResponse({'detail': "No content found."}, status=status.HTTP_204_NO_CONTENT)
        
        






@extend_schema(request=ItinerarySerializer, responses=ItinerarySerializer)
@api_view(['GET'])
# @permission_classes([IsAuthenticated])
# @has_permissions([PermissionEnum.ATTRIBUTE_DETAILS.name])
def getItinerary(request, pk):
	try:
		menu_item = Itinerary.objects.get(pk=pk)
		serializer = ItinerarySerializer(menu_item)
		return Response(serializer.data, status=status.HTTP_200_OK)
	except ObjectDoesNotExist:
		return Response({'detail': f"CMSMenuContent id - {pk} does't exists"}, status=status.HTTP_400_BAD_REQUEST)




@extend_schema(request=ItinerarySerializer, responses=ItinerarySerializer)
@api_view(['POST'])
# @permission_classes([IsAuthenticated])
# @has_permissions([PermissionEnum.ATTRIBUTE_CREATE.name])
def createItinerary(request):
	data = request.data
	print('data: ', data)
	
	serializer = ItinerarySerializer(data=data)

	if serializer.is_valid():
		serializer.save()
		return Response(serializer.data, status=status.HTTP_200_OK)
	else:
		return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)




@extend_schema(request=ItinerarySerializer, responses=ItinerarySerializer)
@api_view(['PUT'])
# @permission_classes([IsAuthenticated])
# @has_permissions([PermissionEnum.ATTRIBUTE_UPDATE.name])
def updateItinerary(request, pk):
	data = request.data

	try:
		menu_item = Itinerary.objects.get(pk=pk)
	except ObjectDoesNotExist:
		return Response({'detail': f"Itinerary id - {pk} doesn't exists"})

	serializer = ItinerarySerializer(menu_item, data=data)
	if serializer.is_valid():
		serializer.save()
		return Response(serializer.data, status=status.HTTP_200_OK)
	else:
		return Response(serializer.errors)
	




@extend_schema(request=ItinerarySerializer, responses=ItinerarySerializer)
@api_view(['DELETE'])
# @permission_classes([IsAuthenticated])
# @has_permissions([PermissionEnum.ATTRIBUTE_DELETE.name])
def deleteItinerary(request, pk):
	try:
		menu_item = Itinerary.objects.get(pk=pk)
		menu_item.delete()
		return Response({'detail': f'Itinerary id - {pk} is deleted successfully'}, status=status.HTTP_200_OK)
	except ObjectDoesNotExist:
		return Response({'detail': f"Itinerary id - {pk} does't exists"}, status=status.HTTP_400_BAD_REQUEST)




@extend_schema(request=ItinerarySerializer, responses=ItinerarySerializer)
@api_view(['GET'])
# @permission_classes([IsAuthenticated])
# @has_permissions([PermissionEnum.ATTRIBUTE_DETAILS.name])
def getItineraryByCMSContent(request, pk):
	try:
		contents = CMSMenuContent.objects.get(pk=pk)
		menu_contents = Itinerary.objects.filter(cms_content=contents)
		serializer = ItinerarySerializer(menu_contents, many=True)
		return Response(serializer.data, status=status.HTTP_200_OK)
	except ObjectDoesNotExist:
		return Response({'detail': f"Itinerary id - {pk} does't exists"}, status=status.HTTP_400_BAD_REQUEST)



