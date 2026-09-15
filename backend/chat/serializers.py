from rest_framework import serializers

from authentication.serializers import EmployeeMinimalListSerializer

from chat.models import Channel, ChannelMembership, Conversation, ConversationParticipant, Message


class ChannelMembershipSerializer(serializers.ModelSerializer):
	member = EmployeeMinimalListSerializer(source='user', read_only=True)

	class Meta:
		model = ChannelMembership
		fields = ['id', 'member', 'is_admin', 'last_read_at', 'created_at']


class ChannelSerializer(serializers.ModelSerializer):
	created_by = EmployeeMinimalListSerializer(read_only=True)
	unread_count = serializers.SerializerMethodField()
	last_message = serializers.SerializerMethodField()

	class Meta:
		model = Channel
		fields = ['id', 'name', 'description', 'is_public', 'is_archived', 'created_by', 'created_at', 'updated_at', 'unread_count', 'last_message']

	def get_unread_count(self, channel):
		# Populated by the view (channel._unread_count) to avoid an N+1
		# query per row on list endpoints — falls back to 0 on a detail
		# fetch where the annotation wasn't applied.
		return getattr(channel, '_unread_count', 0)

	def get_last_message(self, channel):
		message = channel.messages.order_by('-created_at').first()
		return MessageSerializer(message, context=self.context).data if message else None


class ChannelDetailSerializer(ChannelSerializer):
	members = serializers.SerializerMethodField()

	class Meta(ChannelSerializer.Meta):
		fields = ChannelSerializer.Meta.fields + ['members']

	def get_members(self, channel):
		memberships = channel.memberships.select_related('user').all()
		return ChannelMembershipSerializer(memberships, many=True).data


class ConversationSerializer(serializers.ModelSerializer):
	other_participant = serializers.SerializerMethodField()
	last_message = serializers.SerializerMethodField()
	unread_count = serializers.SerializerMethodField()

	class Meta:
		model = Conversation
		fields = ['id', 'other_participant', 'last_message', 'unread_count', 'created_at']

	def get_other_participant(self, conversation):
		request = self.context.get('request')
		other = next(
			(p.user for p in conversation.participants.all() if request and p.user_id != request.user.id),
			None,
		)
		return EmployeeMinimalListSerializer(other).data if other else None

	def get_last_message(self, conversation):
		message = conversation.messages.order_by('-created_at').first()
		return MessageSerializer(message, context=self.context).data if message else None

	def get_unread_count(self, conversation):
		return getattr(conversation, '_unread_count', 0)


class MessageSerializer(serializers.ModelSerializer):
	sender = EmployeeMinimalListSerializer(read_only=True)
	# body/attachment overridden (rather than left as the plain model
	# fields) so a deleted message's real content can never be serialized,
	# even if a caller forgets to check is_deleted first.
	body = serializers.SerializerMethodField()
	attachment = serializers.SerializerMethodField()
	reactions = serializers.SerializerMethodField()

	class Meta:
		model = Message
		fields = ['id', 'channel', 'conversation', 'sender', 'body', 'attachment', 'is_deleted', 'edited_at', 'reactions', 'created_at', 'updated_at']

	def get_body(self, message):
		return None if message.is_deleted else message.body

	def get_attachment(self, message):
		if message.is_deleted or not message.attachment:
			return None
		request = self.context.get('request')
		url = message.attachment.url
		return request.build_absolute_uri(url) if request else url

	def get_reactions(self, message):
		"""Grouped as [{emoji, count, reacted_by_me}] rather than a flat
		per-user list — that's the shape both clients actually render
		(one pill per distinct emoji). reacted_by_me needs the requesting
		user, which isn't always in context (several existing call sites
		instantiate this serializer without one) — falls back to False
		rather than erroring when it's missing."""
		request = self.context.get('request')
		user_id = request.user.id if request and getattr(request, 'user', None) and request.user.is_authenticated else None
		grouped = {}
		for reaction in message.reactions.all():
			entry = grouped.setdefault(reaction.emoji, {'emoji': reaction.emoji, 'count': 0, 'reacted_by_me': False})
			entry['count'] += 1
			if user_id is not None and reaction.user_id == user_id:
				entry['reacted_by_me'] = True
		return list(grouped.values())
