from django.contrib import admin

from support.models import *



# Register your models here.

@admin.register(LoggedUser)
class LoggedUserAdmin(admin.ModelAdmin):
	list_display = [field.name for field in LoggedUser._meta.fields]


@admin.register(TicketDepartment)
class TicketDepartmentAdmin(admin.ModelAdmin):
	list_display = [field.name for field in TicketDepartment._meta.fields]


@admin.register(TicketPriority)
class TicketPriorityAdmin(admin.ModelAdmin):
	list_display = [field.name for field in TicketPriority._meta.fields]


@admin.register(TicketStatus)
class TicketStatusAdmin(admin.ModelAdmin):
	list_display = [field.name for field in TicketStatus._meta.fields]


@admin.register(Ticket)
class TicketAdmin(admin.ModelAdmin):
	list_display = [field.name for field in Ticket._meta.fields]


@admin.register(TicketDetail)
class TicketDetailAdmin(admin.ModelAdmin):
	list_display = [field.name for field in TicketDetail._meta.fields]


@admin.register(Message)
class MessageAdmin(admin.ModelAdmin):
	list_display = [field.name for field in Message._meta.fields]


@admin.register(TaskType)
class TaskTypeAdmin(admin.ModelAdmin):
	list_display = [field.name for field in TaskType._meta.fields]


@admin.register(ToDoTask)
class ToDoTaskAdmin(admin.ModelAdmin):
	list_display = [field.name for field in ToDoTask._meta.fields]

