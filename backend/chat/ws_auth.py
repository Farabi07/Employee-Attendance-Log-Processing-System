from urllib.parse import parse_qs

from django.contrib.auth.models import AnonymousUser

from channels.db import database_sync_to_async
from channels.middleware import BaseMiddleware

from rest_framework_simplejwt.tokens import AccessToken
from rest_framework_simplejwt.exceptions import TokenError


@database_sync_to_async
def _get_user(user_id):
	from authentication.models import User

	try:
		return User.objects.get(pk=user_id, is_active=True)
	except User.DoesNotExist:
		return AnonymousUser()


class JWTAuthMiddleware(BaseMiddleware):
	"""Channels' built-in AuthMiddlewareStack authenticates off the Django
	session cookie, which this app never sets — auth here is JWT Bearer
	only (see REST_FRAMEWORK['DEFAULT_AUTHENTICATION_CLASSES']). Neither a
	browser's nor React Native's WebSocket constructor can attach an
	Authorization header to the handshake request, so the access token is
	passed as a query param instead: wss://host/ws/chat/?token=<access>."""

	async def __call__(self, scope, receive, send):
		query = parse_qs(scope.get('query_string', b'').decode())
		token = (query.get('token') or [None])[0]

		scope['user'] = AnonymousUser()
		if token:
			try:
				validated = AccessToken(token)
				scope['user'] = await _get_user(validated['user_id'])
			except TokenError:
				pass

		return await super().__call__(scope, receive, send)


def JWTAuthMiddlewareStack(inner):
	return JWTAuthMiddleware(inner)
