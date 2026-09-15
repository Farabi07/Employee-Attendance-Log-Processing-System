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
		fields = ['id', 'name', 'description', 'is_archived', 'created_by', 'created_at', 'updated_at', 'unread_count', 'last_message']

	def get_unread_count(self, channel):
		# Populated by the view (channel._unread_count) to avoid an N+1
		# query per row on list endpoints — falls back to 0 on a detail
		# fetch where the annotation wasn't applied.
		return getattr(channel, '_unread_count', 0)

	def get_last_message(self, channel):
		message = channel.messages.order_by('-created_at').first()
		return MessageSerializer(message).data if message else None


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
		return MessageSerializer(message).data if message else None

	def get_unread_count(self, conversation):
		return getattr(conversation, '_unread_count', 0)


class MessageSerializer(serializers.ModelSerializer):
	sender = EmployeeMinimalListSerializer(read_only=True)

	class Meta:
		model = Message
		fields = ['id', 'channel', 'conversation', 'sender', 'body', 'attachment', 'created_at', 'updated_at']
