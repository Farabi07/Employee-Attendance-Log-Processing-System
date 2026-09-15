from channels.db import database_sync_to_async
from channels.generic.websocket import AsyncJsonWebsocketConsumer

from chat.models import ChannelMembership, ConversationParticipant


@database_sync_to_async
def _channel_ids(user):
	return list(ChannelMembership.objects.filter(user=user).values_list('channel_id', flat=True))


@database_sync_to_async
def _conversation_ids(user):
	return list(ConversationParticipant.objects.filter(user=user).values_list('conversation_id', flat=True))


class ChatConsumer(AsyncJsonWebsocketConsumer):
	"""One socket per logged-in user, carrying events for every channel and
	DM they belong to — simpler for both frontends to manage than opening
	N sockets. Group membership is derived from the DB at connect time, so
	a user can only ever be fanned events for content they actually belong
	to; there is no way to subscribe to an arbitrary group from the
	client. All writes happen over REST (see chat/views/*), never here —
	this consumer only ever sends, it never touches the DB to create
	anything."""

	async def connect(self):
		self.user = self.scope.get('user')
		if not self.user or self.user.is_anonymous:
			# Accept first, then close with a specific code — closing before
			# accept() makes most ASGI servers (daphne included) reject the
			# opening handshake at the HTTP level instead of completing it,
			# which strips the close code entirely: browsers/React Native
			# never surface the HTTP status of a failed WS handshake to JS,
			# only a generic onclose/onerror. Accepting first is the only
			# way the client's `onclose` handler actually receives 4001, so
			# it can tell "bad token, stop retrying" apart from a network
			# blip (see mobile/web chatSocket.js).
			await self.accept()
			await self.close(code=4001)
			return

		await self.accept()

		self.groups_joined = [f'chat_user_{self.user.id}']
		self.groups_joined += [f'chat_channel_{channel_id}' for channel_id in await _channel_ids(self.user)]
		self.groups_joined += [f'chat_dm_{conversation_id}' for conversation_id in await _conversation_ids(self.user)]

		for group in self.groups_joined:
			await self.channel_layer.group_add(group, self.channel_name)

	async def disconnect(self, code):
		for group in getattr(self, 'groups_joined', []):
			await self.channel_layer.group_discard(group, self.channel_name)

	# Dispatch targets for channel_layer.group_send({'type': '...'}) calls
	# made from chat/realtime.py — Channels routes '.'-typed events to a
	# method named after the type with dots turned into underscores.

	async def message_new(self, event):
		await self.send_json({'type': 'message.new', **event['payload']})

	async def channel_created(self, event):
		await self.send_json({'type': 'channel.created', **event['payload']})
		channel = event['payload'].get('channel') or {}
		channel_id = channel.get('id')
		if channel_id:
			group = f'chat_channel_{channel_id}'
			if group not in self.groups_joined:
				self.groups_joined.append(group)
				await self.channel_layer.group_add(group, self.channel_name)

	async def channel_member_added(self, event):
		await self.send_json({'type': 'channel.member_added', **event['payload']})

	async def channel_member_removed(self, event):
		await self.send_json({'type': 'channel.member_removed', **event['payload']})
