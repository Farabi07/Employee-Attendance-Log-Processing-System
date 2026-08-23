from django.contrib import admin

from attendance.models import *



# Register your models here.

@admin.register(Shift)
class ShiftAdmin(admin.ModelAdmin):
	list_display = [field.name for field in Shift._meta.fields]


@admin.register(Roster)
class RosterAdmin(admin.ModelAdmin):
	list_display = [field.name for field in Roster._meta.fields]


@admin.register(AttendanceQRToken)
class AttendanceQRTokenAdmin(admin.ModelAdmin):
	list_display = [field.name for field in AttendanceQRToken._meta.fields]


@admin.register(Attendance)
class AttendanceAdmin(admin.ModelAdmin):
	list_display = [field.name for field in Attendance._meta.fields]


@admin.register(LeaveType)
class LeaveTypeAdmin(admin.ModelAdmin):
	list_display = [field.name for field in LeaveType._meta.fields]


@admin.register(LeaveRequest)
class LeaveRequestAdmin(admin.ModelAdmin):
	list_display = [field.name for field in LeaveRequest._meta.fields]
