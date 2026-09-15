"""
ASGI config for start_project project.

It exposes the ASGI callable as a module-level variable named ``application``.

For more information on this file, see
https://docs.djangoproject.com/en/4.0/howto/deployment/asgi/
"""

import os

import django

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'start_project.settings')
django.setup()

from django.core.asgi import get_asgi_application

# Must be created before importing anything that touches models (the
# consumers, via chat.routing) — get_asgi_application() finishes Django's
# app registry setup.
django_asgi_app = get_asgi_application()

from channels.routing import ProtocolTypeRouter, URLRouter

from chat.routing import websocket_urlpatterns
from chat.ws_auth import JWTAuthMiddlewareStack

application = ProtocolTypeRouter({
    'http': django_asgi_app,
    'websocket': JWTAuthMiddlewareStack(URLRouter(websocket_urlpatterns)),
})
