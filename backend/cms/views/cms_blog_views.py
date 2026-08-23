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

from cms.models import Blog, CMSMenu,Blog,Blog
from cms.serializers import BlogSerializer, BlogListSerializer
from cms.filters import *
from commons.pagination import Pagination
from commons.enums import PermissionEnum
import os
import datetime




# Create your views here.

@extend_schema(
	parameters=[
		OpenApiParameter("page"),
		OpenApiParameter("size"),
  ],
	request=BlogListSerializer,
	responses=BlogListSerializer
)
@api_view(['GET'])
# @permission_classes([IsAuthenticated])
# @has_permissions([PermissionEnum.ATTRIBUTE_LIST.name])
def getAllBlog(request):
	blogs = Blog.objects.all()
	total_elements = blogs.count()

	page = request.query_params.get('page')
	size = request.query_params.get('size')

	# Pagination
	pagination = Pagination()
	pagination.page = page
	pagination.size = size
	blogs = pagination.paginate_data(blogs)

	serializer = BlogListSerializer(blogs, many=True)

	response = {
		'blogs': serializer.data,
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
	request=BlogListSerializer,
	responses=BlogListSerializer
)
# @api_view(['GET'])
# # @permission_classes([IsAuthenticated])
# # @has_permissions([PermissionEnum.ATTRIBUTE_LIST.name])
# def getAllBlogWithoutPagination(request):
# 	blogs = Blog.objects.all()

# 	serializer = BlogListSerializer(blogs, many=True)

# 	response = {
# 		'blogs': serializer.data,
# 	}
# 	return Response(response, status=status.HTTP_200_OK)




@extend_schema(
	parameters=[
		OpenApiParameter("page"),
		OpenApiParameter("size"),
  ],
	request=BlogListSerializer,
	responses=BlogListSerializer
)
# @api_view(['GET'])
# # @permission_classes([IsAuthenticated])
# # @has_permissions([PermissionEnum.ATTRIBUTE_LIST.name])
# def getAllBlogByCMSMenuId(request, menu_id):
# 	blogs = Blog.objects.filter(cms_content=menu_id)

# 	serializer = BlogListSerializer(blogs,many=True)
# 	return Response(serializer.data, status=status.HTTP_200_OK)

# 	with connection.cursor() as cursor:
# 		cursor.execute('''
# 						SELECT
# 							cms_menu_id AS cms_menu,
# 							jsonb_build_object(
# 				             	'title', MAX(title),
#                     			'description', MAX(description),
#                     			'location', MAX(location)
# 				            ) AS data
# 						FROM cms_Blog WHERE cms_menu_id=%s
# 						GROUP BY cms_menu_id
# 						ORDER BY cms_menu_id;
# 						''', [menu_id])
  
# 		row = cursor.fetchall()
		
# 	if rows:
# 			my_data = [{'title': row[0],'description':row[1] } for row in rows]
			
# 			response = {'menu_contents': my_data}
# 			return JsonResponse(response, status=status.HTTP_200_OK)
		
# 	else:
# 		return JsonResponse({'detail': "No content found."}, status=status.HTTP_204_NO_CONTENT)
        
        






@extend_schema(request=BlogSerializer, responses=BlogSerializer)
@api_view(['GET'])
# @permission_classes([IsAuthenticated])
# @has_permissions([PermissionEnum.ATTRIBUTE_DETAILS.name])
def getBlog(request, pk):
	try:
		menu_item = Blog.objects.get(pk=pk)
		serializer = BlogSerializer(menu_item)
		return Response(serializer.data, status=status.HTTP_200_OK)
	except ObjectDoesNotExist:
		return Response({'detail': f"Blog id - {pk} does't exists"}, status=status.HTTP_400_BAD_REQUEST)




@extend_schema(request=BlogSerializer, responses=BlogSerializer)
@api_view(['POST'])
# @permission_classes([IsAuthenticated])
# @has_permissions([PermissionEnum.ATTRIBUTE_CREATE.name])
def createBlog(request):
	data = request.data
	print('data: ', data)
	
	serializer = BlogSerializer(data=data)

	if serializer.is_valid():
		serializer.save()
		return Response(serializer.data, status=status.HTTP_200_OK)
	else:
		return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)




@extend_schema(request=BlogSerializer, responses=BlogSerializer)
@api_view(['PUT'])
# @permission_classes([IsAuthenticated])
# @has_permissions([PermissionEnum.ATTRIBUTE_UPDATE.name])
def updateBlog(request, pk):
    data = request.data
    print('data:', data)
    
    try:
        blog_instance = Blog.objects.get(pk=pk)
    except Blog.DoesNotExist:
        return Response({'detail': f"Blog id - {pk} doesn't exist"}, status=status.HTTP_404_NOT_FOUND)

   
    filtered_data = {}
    restricted_values = ['', ' ', '0', 'undefined', None]
    
    for key, value in data.items():
        if key == "file" and isinstance(value, str):
            continue  
        
        if value not in restricted_values:
            filtered_data[key] = value
        else:
            filtered_data[key] = None
    
   
    file_data = data.get("file", None)
    if file_data and not isinstance(file_data, str):  
        
        current_date = datetime.datetime.now().strftime("%Y%m%d")
        file_extension = os.path.splitext(file_data.name)[1]
        new_filename = f"blog_{current_date}{file_extension}"
        
       
        filtered_data["file"] = file_data
        filtered_data["file"].name = new_filename

    print('filtered_data:', filtered_data)

   
    if 'image' in filtered_data and isinstance(filtered_data['image'], str):
        filtered_data.pop('image')  

    serializer = BlogSerializer(blog_instance, data=filtered_data, partial=True)
    if serializer.is_valid():
        serializer.save()
        return Response(serializer.data, status=status.HTTP_200_OK)
    else:
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)




@extend_schema(request=BlogSerializer, responses=BlogSerializer)
@api_view(['DELETE'])
# @permission_classes([IsAuthenticated])
# @has_permissions([PermissionEnum.ATTRIBUTE_DELETE.name])
def deleteBlog(request, pk):
	try:
		menu_item = Blog.objects.get(pk=pk)
		menu_item.delete()
		return Response({'detail': f'Blog id - {pk} is deleted successfully'}, status=status.HTTP_200_OK)
	except ObjectDoesNotExist:
		return Response({'detail': f"Blog id - {pk} does't exists"}, status=status.HTTP_400_BAD_REQUEST)




# @extend_schema(request=BlogSerializer, responses=BlogSerializer)
# @api_view(['GET'])
# # @permission_classes([IsAuthenticated])
# # @has_permissions([PermissionEnum.ATTRIBUTE_DETAILS.name])
# def getBlogByCMSContent(request, pk):
# 	try:
# 		contents = Blog.objects.get(pk=pk)
# 		menu_contents = Blog.objects.filter(cms_content=contents)
# 		serializer = BlogSerializer(menu_contents, many=True)
# 		return Response(serializer.data, status=status.HTTP_200_OK)
# 	except ObjectDoesNotExist:
# 		return Response({'detail': f"Blog id - {pk} does't exists"}, status=status.HTTP_400_BAD_REQUEST)






@extend_schema(request=BlogSerializer, responses=BlogSerializer)
@api_view(['GET'])
# @permission_classes([IsAuthenticated])
# @has_permissions([PermissionEnum.PERMISSION_DETAILS_VIEW.name])
def searchBlog(request):
	blogs = BlogFilter(request.GET, queryset=Blog.objects.all())
	blogs = blogs.qs

	print('searched_blogs: ', blogs)

	total_elements = blogs.count()

	page = request.query_params.get('page')
	size = request.query_params.get('size')

	# Pagination
	pagination = Pagination()
	pagination.page = page
	pagination.size = size
	blogs = pagination.paginate_data(blogs)

	serializer = BlogListSerializer(blogs, many=True)

	response = {
		'blogs': serializer.data,
		'page': pagination.page,
		'size': pagination.size,
		'total_pages': pagination.total_pages,
		'total_elements': total_elements,
	}

	if len(blogs) > 0:
		return Response(response, status=status.HTTP_200_OK)
	else:
		return Response({'detail': f"There are no blogs matching your search"}, status=status.HTTP_400_BAD_REQUEST)



@extend_schema(request=BlogSerializer, responses=BlogSerializer)
@api_view(['GET'])
# @permission_classes([IsAuthenticated])
# @has_permissions([PermissionEnum.ATTRIBUTE_DETAILS.name])
def getBlogByTitle(request, title):
    try:
        
        content = Blog.objects.get(title=title)
        
     
        serializer = BlogSerializer(content)
        
       
        return Response(serializer.data, status=status.HTTP_200_OK)
    
    except ObjectDoesNotExist:
        
        return Response({'detail': f"Blog by title '{title}' does not exist"}, 
                        status=status.HTTP_404_NOT_FOUND)