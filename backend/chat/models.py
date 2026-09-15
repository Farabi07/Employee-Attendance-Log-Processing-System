from django.conf import settings
from django.db import models


def chat_attachment_upload_path(instance, filename):
	organization_id = instance.channel.organization_id if instance.channel_id else instance.conversation.organization_id
	return f'chat_attachments/org_{organization_id}/{filename}'


class Channel(models.Model):
	"""A chat room within one organization — only a manager/moderator can
	create one. Two visibility modes:
	- Selective (is_public=False): invite-only, explicit ChannelMembership
	  rows control who can see it (only they, or a channel admin, can add
	  members).
	- Public (is_public=True): any org member can see/read it without being
	  explicitly invited — see chat/views/_access.py's
	  require_channel_membership, which lazily creates a ChannelMembership
	  row the first time such a user actually opens the channel, so unread
	  tracking and "who's actually here" still work the same way as a
	  selective channel once someone's interacted with it."""

	organization = models.ForeignKey('authentication.Organization', on_delete=models.CASCADE, related_name='channels')
	name = models.CharField(max_length=100)
	description = models.CharField(max_length=255, null=True, blank=True)
	is_public = models.BooleanField(default=False)
	is_archived = models.BooleanField(default=False)

	created_by = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.SET_NULL, related_name='+', null=True, blank=True)
	created_at = models.DateTimeField(auto_now_add=True)
	updated_at = models.DateTimeField(auto_now=True)

	class Meta:
		ordering = ('-updated_at',)

	def __str__(self):
		return self.name


class ChannelMembership(models.Model):
	"""Who can see a Channel. The creator is added as is_admin=True at
	creation time; a manager/moderator can always manage membership too,
	even without an explicit ChannelMembership row of their own (see
	authentication.permissions.IsManagerOrModerator usage in the views)."""

	channel = models.ForeignKey(Channel, on_delete=models.CASCADE, related_name='memberships')
	user = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name='channel_memberships')
	is_admin = models.BooleanField(default=False)
	added_by = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.SET_NULL, related_name='+', null=True, blank=True)
	last_read_at = models.DateTimeField(null=True, blank=True)
	created_at = models.DateTimeField(auto_now_add=True)

	class Meta:
		unique_together = ('channel', 'user')

	def __str__(self):
		return f'{self.user} in {self.channel}'


class Conversation(models.Model):
	"""A 1:1 DM container, kept as its own thin model (rather than a
	normalized user_one/user_two FK pair on Message) so it mirrors
	Channel's membership + last_read_at shape via ConversationParticipant,
	instead of a second, differently-shaped pattern for the same problem."""

	organization = models.ForeignKey('authentication.Organization', on_delete=models.CASCADE, related_name='conversations')
	created_at = models.DateTimeField(auto_now_add=True)

	def __str__(self):
		return f'Conversation {self.pk}'


class ConversationParticipant(models.Model):
	conversation = models.ForeignKey(Conversation, on_delete=models.CASCADE, related_name='participants')
	user = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name='conversation_participations')
	last_read_at = models.DateTimeField(null=True, blank=True)

	class Meta:
		unique_together = ('conversation', 'user')

	def __str__(self):
		return f'{self.user} in {self.conversation}'


class Message(models.Model):
	"""Exactly one of channel/conversation is set — enforced in the views,
	not a DB constraint, matching this codebase's habit of validating in
	views rather than via CheckConstraint. Kept as a single table (instead
	of two near-duplicate Channel/DM message models) so there's one
	serializer, one pagination path, and one WebSocket fan-out helper."""

	channel = models.ForeignKey(Channel, on_delete=models.CASCADE, null=True, blank=True, related_name='messages')
	conversation = models.ForeignKey(Conversation, on_delete=models.CASCADE, null=True, blank=True, related_name='messages')

	sender = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.SET_NULL, null=True, blank=True, related_name='sent_chat_messages')
	body = models.TextField(null=True, blank=True)
	attachment = models.FileField(upload_to=chat_attachment_upload_path, null=True, blank=True)

	# Soft delete — the row stays (so the thread has no gap where it sat)
	# but body/attachment are cleared server-side the moment this is set
	# (see message_views.deleteMessage), so old content can never leak
	# through even if a client forgets to check is_deleted.
	is_deleted = models.BooleanField(default=False)
	edited_at = models.DateTimeField(null=True, blank=True)

	created_at = models.DateTimeField(auto_now_add=True)
	updated_at = models.DateTimeField(auto_now=True)

	class Meta:
		ordering = ('-created_at',)

	def __str__(self):
		return f'Message {self.pk} from {self.sender}'


class MessageReaction(models.Model):
	"""A single emoji reaction from one user on one message. Reacting with
	an emoji the same user already gave toggles it off (see
	message_views.reactToMessage) rather than duplicating — the same user
	can still have several different emoji on one message at once."""

	message = models.ForeignKey(Message, on_delete=models.CASCADE, related_name='reactions')
	user = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name='+')
	emoji = models.CharField(max_length=8)
	created_at = models.DateTimeField(auto_now_add=True)

	class Meta:
		unique_together = ('message', 'user', 'emoji')

	def __str__(self):
		return f'{self.emoji} from {self.user} on message {self.message_id}'
