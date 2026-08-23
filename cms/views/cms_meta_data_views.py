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

from cms.models import CMSMenuContent, CMSMenu, MetaData
from cms.filters import MetaDataFilter
from cms.serializers import MetaDataSerializer, MetaDataListSerializer

from commons.pagination import Pagination
from commons.enums import PermissionEnum

import datetime
import os



# Create your views here.

@extend_schema(
	parameters=[
		OpenApiParameter("page"),
		OpenApiParameter("size"),
  ],
	request=MetaDataListSerializer,
	responses=MetaDataListSerializer
)
@api_view(['GET'])
# @permission_classes([IsAuthenticated])
# @has_permissions([PermissionEnum.ATTRIBUTE_LIST.name])
def getAllMetaData(request):
	meta_data = MetaData.objects.all()
	total_elements = meta_data.count()

	page = request.query_params.get('page')
	size = request.query_params.get('size')

	# Pagination
	pagination = Pagination()
	pagination.page = page
	pagination.size = size
	meta_data = pagination.paginate_data(meta_data)

	serializer = MetaDataListSerializer(meta_data, many=True)

	response = {
		'meta_data': serializer.data,
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
	request=MetaDataListSerializer,
	responses=MetaDataListSerializer
)
@api_view(['GET'])
# @permission_classes([IsAuthenticated])
# @has_permissions([PermissionEnum.ATTRIBUTE_LIST.name])
def getAllMetaDataWithoutPagination(request):
	meta_data = MetaData.objects.all()

	serializer = MetaDataListSerializer(meta_data, many=True)

	response = {
		'meta_data': serializer.data,
	}
	return Response(response, status=status.HTTP_200_OK)




@extend_schema(
	parameters=[
		OpenApiParameter("page"),
		OpenApiParameter("size"),
  ],
	request=MetaDataListSerializer,
	responses=MetaDataListSerializer
)
@api_view(['GET'])
# @permission_classes([IsAuthenticated])
# @has_permissions([PermissionEnum.ATTRIBUTE_LIST.name])
def getAllMetaDataByCMSMenuId(request, menu_id):
	meta_data = MetaData.objects.filter(cms_content=menu_id)

	serializer = MetaDataListSerializer(meta_data,many=True)
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
	# 					FROM cms_MetaData WHERE cms_menu_id=%s
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
        
        






@extend_schema(request=MetaDataSerializer, responses=MetaDataSerializer)
@api_view(['GET'])
# @permission_classes([IsAuthenticated])
# @has_permissions([PermissionEnum.ATTRIBUTE_DETAILS.name])
def getMetaData(request, pk):
	try:
		meta_data = MetaData.objects.get(pk=pk)
		serializer = MetaDataSerializer(meta_data)
		return Response(serializer.data, status=status.HTTP_200_OK)
	except ObjectDoesNotExist:
		return Response({'detail': f"CMSMenuContent id - {pk} does't exists"}, status=status.HTTP_400_BAD_REQUEST)




@extend_schema(request=MetaDataSerializer, responses=MetaDataSerializer)
@api_view(['POST'])
# @permission_classes([IsAuthenticated])
# @has_permissions([PermissionEnum.ATTRIBUTE_CREATE.name])
def createMetaData(request):
	data = request.data
	print('data: ', data)
	
	serializer = MetaDataSerializer(data=data)

	if serializer.is_valid():
		serializer.save()
		return Response(serializer.data, status=status.HTTP_200_OK)
	else:
		return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)




@extend_schema(request=MetaDataSerializer, responses=MetaDataSerializer)
@api_view(['PUT'])
# @permission_classes([IsAuthenticated])
# @has_permissions([PermissionEnum.ATTRIBUTE_UPDATE.name])
def updateMetaData(request, pk):
	data = request.data

	try:
		meta_data = MetaData.objects.get(pk=pk)
	except ObjectDoesNotExist:
		return Response({'detail': f"MetaData id - {pk} doesn't exists"})

	serializer = MetaDataSerializer(meta_data, data=data)
	if serializer.is_valid():
		serializer.save()
		return Response(serializer.data, status=status.HTTP_200_OK)
	else:
		return Response(serializer.errors)
	




@extend_schema(request=MetaDataSerializer, responses=MetaDataSerializer)
@api_view(['DELETE'])
# @permission_classes([IsAuthenticated])
# @has_permissions([PermissionEnum.ATTRIBUTE_DELETE.name])
def deleteMetaData(request, pk):
	try:
		meta_data = MetaData.objects.get(pk=pk)
		meta_data.delete()
		return Response({'detail': f'MetaData id - {pk} is deleted successfully'}, status=status.HTTP_200_OK)
	except ObjectDoesNotExist:
		return Response({'detail': f"MetaData id - {pk} does't exists"}, status=status.HTTP_400_BAD_REQUEST)




@extend_schema(request=MetaDataSerializer, responses=MetaDataSerializer)
@api_view(['GET'])
# @permission_classes([IsAuthenticated])
# @has_permissions([PermissionEnum.ATTRIBUTE_DETAILS.name])
def getMetaDataByCMSContent(request, slug):
    try:
        # Get CMSMenuContent object by slug
        cms_menu_content = CMSMenuContent.objects.filter(slug=slug).first()

        # Ensure CMSMenuContent object is found
        if not cms_menu_content:
            return Response({'detail': f"No CMSMenuContent found for slug '{slug}'"}, status=status.HTTP_404_NOT_FOUND)

        # Get associated MetaData object for the found CMSMenuContent
        meta_data = MetaData.objects.filter(cms_content=cms_menu_content).first()

        # Serialize MetaData object
        if meta_data:
            serializer = MetaDataSerializer(meta_data)
            return Response(serializer.data, status=status.HTTP_200_OK)
        else:
            return Response({'detail': f"No MetaData found for CMSMenuContent with slug '{slug}'"}, status=status.HTTP_404_NOT_FOUND)

    except Exception as e:
        return Response({'detail': str(e)}, status=status.HTTP_400_BAD_REQUEST)


@extend_schema(request=MetaDataSerializer, responses=MetaDataSerializer)
@api_view(['GET'])
# @permission_classes([IsAuthenticated])
# @has_permissions([PermissionEnum.PERMISSION_DETAILS_VIEW.name])
def searchMetaData(request):
	meta_data = MetaDataFilter(request.GET, queryset=MetaData.objects.all())
	meta_data = meta_data.qs

	print('searched_meta_data: ', meta_data)

	total_elements = meta_data.count()

	page = request.query_params.get('page')
	size = request.query_params.get('size')

	# Pagination
	pagination = Pagination()
	pagination.page = page
	pagination.size = size
	meta_data = pagination.paginate_data(meta_data)

	serializer = MetaDataListSerializer(meta_data, many=True)

	response = {
		'meta_data': serializer.data,
		'page': pagination.page,
		'size': pagination.size,
		'total_pages': pagination.total_pages,
		'total_elements': total_elements,
	}

	if len(meta_data) > 0:
		return Response(response, status=status.HTTP_200_OK)
	else:
		return Response({'detail': f"There are no MetaDatas matching your search"}, status=status.HTTP_400_BAD_REQUEST)


