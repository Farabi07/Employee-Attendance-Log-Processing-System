from django.http import JsonResponse, HttpResponseRedirect
from rest_framework.response import Response
from django.views.decorators.csrf import csrf_exempt
from django.core.validators import URLValidator
from django.core.exceptions import ValidationError
from url_shortener.models import ShortenedURL
import random
import string
from rest_framework.decorators import api_view
from drf_spectacular.utils import extend_schema, OpenApiParameter
from url_shortener.serializers import ShortenedURLSerializer
from django.conf import settings
from urllib.parse import urlparse

def generate_short_code():
    characters = string.ascii_letters + string.digits
    while True:
        short_code = ''.join(random.choice(characters) for _ in range(6))
        if not ShortenedURL.objects.filter(short_code=short_code).exists():
            return short_code

@extend_schema(
    parameters=[
        OpenApiParameter("original_url", str, OpenApiParameter.QUERY),
    ],
    request=ShortenedURLSerializer,
    responses=ShortenedURLSerializer
)
@csrf_exempt
@api_view(['POST'])
def shorten_url_and_redirect(request):
    try:
        data = request.data
        original_url = data.get('original_url')

        if not original_url:
            return JsonResponse({'error': 'Please provide a valid "original_url"'}, status=400)

        validator = URLValidator()
        try:
            validator(original_url)
        except ValidationError:
            return Response({'error': 'Invalid URL format'}, status=400)

        parsed_url = urlparse(original_url)
        original_url = parsed_url.path

        short_code = generate_short_code()

        shortened_url, created = ShortenedURL.objects.get_or_create(
            original_url=original_url,
            defaults={'short_code': short_code}
        )

        if not created:
            short_code = shortened_url.short_code

        shortened_url.short_code = short_code
        shortened_url.save()

        return Response({'shortened_url': f'{settings.FRONTEND_BASE_URL}/{short_code}'}, status=201)

    except ValidationError:
        return Response({'error': 'Invalid URL format'}, status=400)


@extend_schema(
    parameters=[
        OpenApiParameter("short_code", str, OpenApiParameter.PATH),
    ],
    responses={302: None}
)
@csrf_exempt
@api_view(['GET'])
def get_redirected_url(request, short_code):
    try:
        shortened_url = ShortenedURL.objects.get(short_code=short_code)
        original_url = shortened_url.original_url
        return HttpResponseRedirect(f'{settings.FRONTEND_BASE_URL}{original_url}')

    except ShortenedURL.DoesNotExist:
        return Response({'error': 'Shortened URL not found'}, status=404)
