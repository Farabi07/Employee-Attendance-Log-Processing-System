from asgiref.sync import async_to_sync
from channels.layers import get_channel_layer


def broadcast_to_group(group_name, event_type, payload):
	"""Fan out one event to every socket currently in a channel-layer group
	(chat_channel_<id>, chat_dm_<id> or chat_user_<id> — see
	chat/consumers.py). Called from the REST send/create views right after
	the DB write, never from the consumer itself: all writes go through
	REST so validation/permissions/attachment handling stay in one place,
	and the WebSocket layer is pure delivery. A missing/unreachable channel
	layer (e.g. Redis down) must never fail the REST request that
	triggered it — real-time delivery degrades, but the message is still
	saved and visible on next fetch."""
	channel_layer = get_channel_layer()
	if channel_layer is None:
		return
	try:
		async_to_sync(channel_layer.group_send)(group_name, {'type': event_type, 'payload': payload})
	except Exception:  # pragma: no cover - channel layer unreachable, not worth surfacing to the caller
		pass
