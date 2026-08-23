from django.conf import settings

from rest_framework import serializers
from rest_framework_recursive.fields import RecursiveField

from django_currentuser.middleware import get_current_authenticated_user

from authentication.serializers import AdminUserMinimalListSerializer

from url_shortener.models import *

class ShortenedURLSerializer(serializers.ModelSerializer):
    class Meta:
        model = ShortenedURL
        fields = ['original_url', 'short_code']
