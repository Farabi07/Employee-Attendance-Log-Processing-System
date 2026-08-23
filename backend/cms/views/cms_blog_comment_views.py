from django.core.exceptions import ObjectDoesNotExist
from django.db import connection
from django.db.models import Q
from django.http import JsonResponse
from django.shortcuts import get_object_or_404
from rest_framework import status
from rest_framework.decorators import api_view, permission_classes, parser_classes
from rest_framework.parsers import JSONParser, MultiPartParser, FormParser
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response

from drf_spectacular.utils import  extend_schema, OpenApiParameter

from authentication.decorators import has_permissions

from cms.models import BlogComments, CMSMenu,Blog,BlogComments
from cms.serializers import BlogCommentsSerializer, BlogCommentsListSerializer
from cms.filters import *
from commons.pagination import Pagination
from commons.enums import PermissionEnum

import datetime



##############
# Create your views here.

@extend_schema(
	parameters=[
		OpenApiParameter("page"),
		OpenApiParameter("size"),
  ],
	request=BlogCommentsListSerializer,
	responses=BlogCommentsListSerializer
)
@api_view(['GET'])
# @permission_classes([IsAuthenticated])
# @has_permissions([PermissionEnum.ATTRIBUTE_LIST.name])
def getAllBlogComments(request):
	blogs_Comment = BlogComments.objects.all()
	total_elements = blogs_Comment.count()

	page = request.query_params.get('page')
	size = request.query_params.get('size')

	# Pagination
	pagination = Pagination()
	pagination.page = page
	pagination.size = size
	blogs_Comment = pagination.paginate_data(blogs_Comment)

	serializer = BlogCommentsListSerializer(blogs_Comment, many=True)

	response = {
		'blogs_Comment': serializer.data,
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
	request=BlogCommentsListSerializer,
	responses=BlogCommentsListSerializer
)
  

@extend_schema(request=BlogCommentsSerializer, responses=BlogCommentsSerializer)
@api_view(['GET'])
# @permission_classes([IsAuthenticated])
# @has_permissions([PermissionEnum.ATTRIBUTE_DETAILS.name])
def getBlogComments(request, pk):
	try:
		menu_item = BlogComments.objects.get(pk=pk)
		serializer = BlogCommentsSerializer(menu_item)
		return Response(serializer.data, status=status.HTTP_200_OK)
	except ObjectDoesNotExist:
		return Response({'detail': f"BlogComments id - {pk} does't exists"}, status=status.HTTP_400_BAD_REQUEST)




@extend_schema(request=BlogCommentsSerializer, responses=BlogCommentsSerializer)
@api_view(['POST'])
# @permission_classes([IsAuthenticated])
# @has_permissions([PermissionEnum.ATTRIBUTE_CREATE.name])
def createBlogComments(request):
	data = request.data
	print('data: ', data)
	
	serializer = BlogCommentsSerializer(data=data)

	if serializer.is_valid():
		serializer.save()
		return Response(serializer.data, status=status.HTTP_200_OK)
	else:
		return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)




@extend_schema(request=BlogCommentsSerializer, responses=BlogCommentsSerializer)
@api_view(['PUT'])
# @permission_classes([IsAuthenticated])
# @has_permissions([PermissionEnum.ATTRIBUTE_UPDATE.name])
def updateBlogComments(request, pk):
    data = request.data
    print('data:', data)
    
    try:
        blog_instance = BlogComments.objects.get(pk=pk)
    except BlogComments.DoesNotExist:
        return Response({'detail': f"BlogComments id - {pk} doesn't exist"}, status=status.HTTP_404_NOT_FOUND)

   
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

    serializer = BlogCommentsSerializer(blog_instance, data=filtered_data, partial=True)
    if serializer.is_valid():
        serializer.save()
        return Response(serializer.data, status=status.HTTP_200_OK)
    else:
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)




@extend_schema(request=BlogCommentsSerializer, responses=BlogCommentsSerializer)
@api_view(['DELETE'])
# @permission_classes([IsAuthenticated])
# @has_permissions([PermissionEnum.ATTRIBUTE_DELETE.name])
def deleteBlogComments(request, pk):
	try:
		menu_item = BlogComments.objects.get(pk=pk)
		menu_item.delete()
		return Response({'detail': f'BlogComments id - {pk} is deleted successfully'}, status=status.HTTP_200_OK)
	except ObjectDoesNotExist:
		return Response({'detail': f"BlogComments id - {pk} does't exists"}, status=status.HTTP_400_BAD_REQUEST)


@extend_schema(request=BlogCommentsSerializer, responses=BlogCommentsSerializer)
@api_view(['GET'])
# @permission_classes([IsAuthenticated])
# @has_permissions([PermissionEnum.PERMISSION_DETAILS_VIEW.name])
def searchBlogComments(request):
	blogs_Comment = BlogCommentsFilter(request.GET, queryset=BlogComments.objects.all())
	blogs_Comment = blogs_Comment.qs

	print('searched_blogs: ', blogs_Comment)

	total_elements = blogs_Comment.count()

	page = request.query_params.get('page')
	size = request.query_params.get('size')

	# Pagination
	pagination = Pagination()
	pagination.page = page
	pagination.size = size
	blogs_Comment = pagination.paginate_data(blogs_Comment)

	serializer = BlogCommentsListSerializer(blogs_Comment, many=True)

	response = {
		'blogs_Comment': serializer.data,
		'page': pagination.page,
		'size': pagination.size,
		'total_pages': pagination.total_pages,
		'total_elements': total_elements,
	}

	if len(blogs_Comment) > 0:
		return Response(response, status=status.HTTP_200_OK)
	else:
		return Response({'detail': f"There are no blogs matching your search"}, status=status.HTTP_400_BAD_REQUEST)



@extend_schema(request=BlogCommentsSerializer, responses=BlogCommentsSerializer)
@api_view(['GET'])
# @permission_classes([IsAuthenticated])
# @has_permissions([PermissionEnum.ATTRIBUTE_DETAILS.name])
def getBlogCommentsByTitle(request, title):
    try:
        
        blog_post = get_object_or_404(Blog, title=title)
        
        
        blog_comments = BlogComments.objects.filter(blog=blog_post)
        
        
        serializer = BlogCommentsSerializer(blog_comments, many=True)
        
        return Response(serializer.data, status=status.HTTP_200_OK)
    
    except Blog.DoesNotExist:
        return Response({'detail': f"Blog with title '{title}' does not exist"}, 
                        status=status.HTTP_404_NOT_FOUND)
    
	 
@extend_schema(request=BlogCommentsSerializer, responses=BlogCommentsSerializer)
@api_view(['POST'])
# @permission_classes([IsAuthenticated])
# @has_permissions([PermissionEnum.ATTRIBUTE_DETAILS.name])
def vote_comment(request, comment_id, vote_type):
    comment = get_object_or_404(BlogComments, id=comment_id)
    if vote_type == 'helpful':
        comment.helpful += 1
    elif vote_type == 'not_helpful':
        comment.not_helpful += 1
    else:
        return JsonResponse({'error': 'Invalid vote type.'}, status=400)

    comment.save()

    return JsonResponse({'success': True})