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

from cms.models import Blog, CMSMenu,Blog,Review
from cms.serializers import ReviewSerializer, ReviewListSerializer
from cms.filters import *
from commons.pagination import Pagination
from commons.enums import PermissionEnum

import datetime




# Create your views here.

@extend_schema(
	parameters=[
		OpenApiParameter("page"),
		OpenApiParameter("size"),
  ],
	request=ReviewListSerializer,
	responses=ReviewListSerializer
)
@api_view(['GET'])
# @permission_classes([IsAuthenticated])
# @has_permissions([PermissionEnum.ATTRIBUTE_LIST.name])
def getAllReview(request):
    reviews = Review.objects.all()
    total_elements = reviews.count()

    serializer = ReviewListSerializer(reviews, many=True)

    response = {
        'reviews': serializer.data,
        'total_elements': total_elements,
    }
    return Response(response, status=status.HTTP_200_OK)

