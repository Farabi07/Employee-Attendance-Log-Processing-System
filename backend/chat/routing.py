from django.urls import re_path

from chat import consumers
from chat.debug_asgi import bare_ws_app

websocket_urlpatterns = [
	re_path(r'^ws/chat/$', consumers.ChatConsumer.as_asgi()),

	# TEMPORARY — diagnosing a production WebSocket hang, remove after
	re_path(r'^ws/debug-bare/$', bare_ws_app),
]
