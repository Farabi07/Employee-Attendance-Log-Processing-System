# TEMPORARY — diagnosing a production Redis connectivity hang. Delete this
# file and its url once the chat WebSocket real-time delivery is confirmed
# working end to end.
import asyncio
import importlib.metadata
import socket
import time
from urllib.parse import urlparse

from asgiref.sync import async_to_sync
from django.conf import settings

from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import AllowAny
from rest_framework.response import Response


def _installed_versions():
	versions = {}
	for pkg in ['channels', 'channels-redis', 'daphne', 'redis', 'asgiref', 'Twisted', 'autobahn']:
		try:
			versions[pkg] = importlib.metadata.version(pkg)
		except importlib.metadata.PackageNotFoundError:
			versions[pkg] = 'NOT INSTALLED'
	return versions


async def _redis_asyncio_ping(host, port, timeout):
	import redis.asyncio as redis_asyncio

	client = redis_asyncio.Redis(host=host, port=port, socket_connect_timeout=timeout, socket_timeout=timeout)
	try:
		pong = await asyncio.wait_for(client.ping(), timeout=timeout)
		return pong
	finally:
		await client.aclose()


async def _channel_layer_new_channel(timeout):
	from channels.layers import get_channel_layer

	channel_layer = get_channel_layer()
	return await asyncio.wait_for(channel_layer.new_channel(), timeout=timeout)


@api_view(['GET'])
@permission_classes([AllowAny])
def debugRedisCheck(request):
	hosts = settings.CHANNEL_LAYERS['default']['CONFIG']['hosts']
	parsed = urlparse(hosts[0])
	result = {'target': hosts[0], 'host': parsed.hostname, 'port': parsed.port, 'versions': _installed_versions()}

	start = time.monotonic()
	try:
		s = socket.create_connection((parsed.hostname, parsed.port), timeout=8)
		s.close()
		result['raw_tcp_connect'] = 'OK'
		result['raw_tcp_elapsed'] = round(time.monotonic() - start, 2)
	except Exception as e:
		result['raw_tcp_connect'] = 'FAILED'
		result['raw_tcp_error'] = f'{type(e).__name__}: {e}'
		result['raw_tcp_elapsed'] = round(time.monotonic() - start, 2)

	start = time.monotonic()
	try:
		pong = async_to_sync(_redis_asyncio_ping)(parsed.hostname, parsed.port, 8)
		result['redis_asyncio_ping'] = 'OK' if pong else 'NO PONG'
		result['redis_asyncio_elapsed'] = round(time.monotonic() - start, 2)
	except Exception as e:
		result['redis_asyncio_ping'] = 'FAILED'
		result['redis_asyncio_error'] = f'{type(e).__name__}: {e}'
		result['redis_asyncio_elapsed'] = round(time.monotonic() - start, 2)

	start = time.monotonic()
	try:
		channel_name = async_to_sync(_channel_layer_new_channel)(8)
		result['channel_layer_new_channel'] = 'OK'
		result['channel_name'] = channel_name
		result['channel_layer_elapsed'] = round(time.monotonic() - start, 2)
	except Exception as e:
		result['channel_layer_new_channel'] = 'FAILED'
		result['channel_layer_error'] = f'{type(e).__name__}: {e}'
		result['channel_layer_elapsed'] = round(time.monotonic() - start, 2)

	return Response(result)
