# TEMPORARY — diagnosing a production Redis connectivity hang. Delete this
# file and its url once the chat WebSocket real-time delivery is confirmed
# working end to end.
import socket
import time
from urllib.parse import urlparse

from django.conf import settings

from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import AllowAny
from rest_framework.response import Response


@api_view(['GET'])
@permission_classes([AllowAny])
def debugRedisCheck(request):
	hosts = settings.CHANNEL_LAYERS['default']['CONFIG']['hosts']
	parsed = urlparse(hosts[0])
	result = {'target': hosts[0], 'host': parsed.hostname, 'port': parsed.port}

	start = time.monotonic()
	try:
		s = socket.create_connection((parsed.hostname, parsed.port), timeout=8)
		s.close()
		result['tcp_connect'] = 'OK'
		result['elapsed_seconds'] = round(time.monotonic() - start, 2)
	except Exception as e:
		result['tcp_connect'] = 'FAILED'
		result['error_type'] = type(e).__name__
		result['error'] = str(e)
		result['elapsed_seconds'] = round(time.monotonic() - start, 2)

	return Response(result)
