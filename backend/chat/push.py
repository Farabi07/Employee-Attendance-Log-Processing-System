import requests

EXPO_PUSH_URL = 'https://exp.host/--/api/v2/push/send'


def send_expo_push_for_message(recipient, title, body, data):
	"""Fire-and-forget push for one chat Message, parallel to
	attendance/push.py's send_expo_push_for_notification (not reused
	directly — that one is typed around a Notification's
	title/message/notification_type fields, which a chat Message doesn't
	have). Never raises — a failed/missing push should never break the
	send-message request that triggered it."""
	token = getattr(recipient, 'expo_push_token', None)
	if not token:
		return
	try:
		requests.post(
			EXPO_PUSH_URL,
			json={
				'to': token,
				'title': title,
				'body': body,
				'data': data,
				'sound': None if getattr(recipient, 'silent_mode', False) else 'default',
			},
			headers={'Accept': 'application/json', 'Content-Type': 'application/json'},
			timeout=5,
		)
	except Exception:  # pragma: no cover - network errors, not worth surfacing to the caller
		pass
