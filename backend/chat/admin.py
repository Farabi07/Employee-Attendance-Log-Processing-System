from django.contrib import admin

from chat.models import *



# Register your models here.

@admin.register(Channel)
class ChannelAdmin(admin.ModelAdmin):
	list_display = [field.name for field in Channel._meta.fields]


@admin.register(ChannelMembership)
class ChannelMembershipAdmin(admin.ModelAdmin):
	list_display = [field.name for field in ChannelMembership._meta.fields]


@admin.register(Conversation)
class ConversationAdmin(admin.ModelAdmin):
	list_display = [field.name for field in Conversation._meta.fields]


@admin.register(ConversationParticipant)
class ConversationParticipantAdmin(admin.ModelAdmin):
	list_display = [field.name for field in ConversationParticipant._meta.fields]


@admin.register(Message)
class MessageAdmin(admin.ModelAdmin):
	list_display = [field.name for field in Message._meta.fields]
