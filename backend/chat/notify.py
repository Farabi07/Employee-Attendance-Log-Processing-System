from chat.push import send_expo_push_for_message


def notify_channel_message(message):
	"""Push every other channel member (the sender doesn't need a push for
	their own message) — real-time delivery to an open app/tab happens
	separately via chat/realtime.py's WebSocket broadcast; this covers
	backgrounded/offline recipients."""
	from authentication.models import User

	recipients = User.objects.filter(channel_memberships__channel_id=message.channel_id).exclude(pk=message.sender_id)
	sender_name = f'{message.sender.first_name} {message.sender.last_name}'.strip() if message.sender else 'Someone'
	for recipient in recipients:
		send_expo_push_for_message(
			recipient,
			title=message.channel.name,
			body=f'{sender_name}: {message.body}' if message.body else f'{sender_name} sent an attachment',
			data={'type': 'chat_channel', 'channel_id': message.channel_id},
		)


def notify_conversation_message(message):
	from authentication.models import User

	recipients = User.objects.filter(conversation_participations__conversation_id=message.conversation_id).exclude(pk=message.sender_id)
	sender_name = f'{message.sender.first_name} {message.sender.last_name}'.strip() if message.sender else 'Someone'
	for recipient in recipients:
		send_expo_push_for_message(
			recipient,
			title=sender_name,
			body=message.body or 'Sent an attachment',
			data={'type': 'chat_dm', 'conversation_id': message.conversation_id},
		)
