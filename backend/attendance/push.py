import requests

EXPO_PUSH_URL = 'https://exp.host/--/api/v2/push/send'


def send_expo_push_for_notification(notification):
	"""Fire-and-forget push for one Notification row, via Expo's push
	service (no per-platform FCM/APNs credentials needed — Expo relays to
	both). Called from attendance/signals.py on every Notification
	.create(), and directly from the three bulk_create() call sites in
	notify.py, since Django's bulk_create deliberately skips post_save
	signals. Never raises — a failed/missing push should never break the
	request that triggered the underlying notification."""
	token = getattr(notification.recipient, 'expo_push_token', None)
	if not token:
		return
	try:
		requests.post(
			EXPO_PUSH_URL,
			json={
				'to': token,
				'title': notification.title,
				'body': notification.message or '',
				'data': {'notification_type': notification.notification_type},
			},
			headers={'Accept': 'application/json', 'Content-Type': 'application/json'},
			timeout=5,
		)
	except Exception:  # pragma: no cover - network errors, not worth surfacing to the caller
		pass
