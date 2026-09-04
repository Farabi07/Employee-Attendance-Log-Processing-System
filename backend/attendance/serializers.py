from rest_framework import serializers

from django_currentuser.middleware import get_current_authenticated_user

from attendance.models import *

from authentication.serializers import (
	EmployeeMinimalListSerializer,
	BranchMinimalListSerializer,
)




class ShiftListSerializer(serializers.ModelSerializer):
	branch = BranchMinimalListSerializer()
	created_by = serializers.SerializerMethodField()
	updated_by = serializers.SerializerMethodField()

	class Meta:
		model = Shift
		fields = '__all__'

	def get_created_by(self, obj):
		return obj.created_by.email if obj.created_by else obj.created_by

	def get_updated_by(self, obj):
		return obj.updated_by.email if obj.updated_by else obj.updated_by




class ShiftMinimalListSerializer(serializers.ModelSerializer):
	class Meta:
		model = Shift
		fields = ['id', 'name', 'start_time', 'end_time']




class ShiftSerializer(serializers.ModelSerializer):
	class Meta:
		model = Shift
		fields = '__all__'

	def create(self, validated_data):
		modelObject = super().create(validated_data=validated_data)
		user = get_current_authenticated_user()
		if user is not None:
			modelObject.created_by = user
		modelObject.save()
		return modelObject

	def update(self, instance, validated_data):
		modelObject = super().update(instance=instance, validated_data=validated_data)
		user = get_current_authenticated_user()
		if user is not None:
			modelObject.updated_by = user
		modelObject.save()
		return modelObject




class RosterListSerializer(serializers.ModelSerializer):
	employee = EmployeeMinimalListSerializer()
	shift = ShiftMinimalListSerializer()
	created_by = serializers.SerializerMethodField()
	updated_by = serializers.SerializerMethodField()

	class Meta:
		model = Roster
		fields = '__all__'

	def get_created_by(self, obj):
		return obj.created_by.email if obj.created_by else obj.created_by

	def get_updated_by(self, obj):
		return obj.updated_by.email if obj.updated_by else obj.updated_by




class RosterSerializer(serializers.ModelSerializer):
	class Meta:
		model = Roster
		fields = '__all__'

	def create(self, validated_data):
		modelObject = super().create(validated_data=validated_data)
		user = get_current_authenticated_user()
		if user is not None:
			modelObject.created_by = user
		modelObject.save()
		return modelObject

	def update(self, instance, validated_data):
		modelObject = super().update(instance=instance, validated_data=validated_data)
		user = get_current_authenticated_user()
		if user is not None:
			modelObject.updated_by = user
		modelObject.save()
		return modelObject




class AttendanceQRTokenSerializer(serializers.ModelSerializer):
	branch = BranchMinimalListSerializer(read_only=True)

	class Meta:
		model = AttendanceQRToken
		# `token` is the TOTP seed secret — never serialize it out. Anyone who
		# gets it can compute every future code, forever, defeating the whole
		# point of the code rotating. The frontend only ever needs the live
		# code from the /live/ endpoint, not this seed.
		exclude = ['token']




class AttendanceListSerializer(serializers.ModelSerializer):
	employee = EmployeeMinimalListSerializer()
	branch = BranchMinimalListSerializer()
	created_by = serializers.SerializerMethodField()
	updated_by = serializers.SerializerMethodField()

	class Meta:
		model = Attendance
		fields = '__all__'

	def get_created_by(self, obj):
		return obj.created_by.email if obj.created_by else obj.created_by

	def get_updated_by(self, obj):
		return obj.updated_by.email if obj.updated_by else obj.updated_by




class AttendanceSerializer(serializers.ModelSerializer):
	class Meta:
		model = Attendance
		fields = '__all__'

	def create(self, validated_data):
		modelObject = super().create(validated_data=validated_data)
		user = get_current_authenticated_user()
		if user is not None:
			modelObject.created_by = user
		modelObject.save()
		return modelObject

	def update(self, instance, validated_data):
		modelObject = super().update(instance=instance, validated_data=validated_data)
		user = get_current_authenticated_user()
		if user is not None:
			modelObject.updated_by = user
		modelObject.save()
		return modelObject




class LeaveTypeListSerializer(serializers.ModelSerializer):
	created_by = serializers.SerializerMethodField()
	updated_by = serializers.SerializerMethodField()

	class Meta:
		model = LeaveType
		fields = '__all__'

	def get_created_by(self, obj):
		return obj.created_by.email if obj.created_by else obj.created_by

	def get_updated_by(self, obj):
		return obj.updated_by.email if obj.updated_by else obj.updated_by




class LeaveTypeMinimalListSerializer(serializers.ModelSerializer):
	class Meta:
		model = LeaveType
		fields = ['id', 'name']




class LeaveTypeSerializer(serializers.ModelSerializer):
	class Meta:
		model = LeaveType
		fields = '__all__'

	def create(self, validated_data):
		modelObject = super().create(validated_data=validated_data)
		user = get_current_authenticated_user()
		if user is not None:
			modelObject.created_by = user
		modelObject.save()
		return modelObject

	def update(self, instance, validated_data):
		modelObject = super().update(instance=instance, validated_data=validated_data)
		user = get_current_authenticated_user()
		if user is not None:
			modelObject.updated_by = user
		modelObject.save()
		return modelObject




class LeaveRequestListSerializer(serializers.ModelSerializer):
	employee = EmployeeMinimalListSerializer()
	leave_type = LeaveTypeMinimalListSerializer()
	reviewed_by = serializers.SerializerMethodField()
	created_by = serializers.SerializerMethodField()
	updated_by = serializers.SerializerMethodField()

	class Meta:
		model = LeaveRequest
		fields = '__all__'

	def get_reviewed_by(self, obj):
		return obj.reviewed_by.email if obj.reviewed_by else obj.reviewed_by

	def get_created_by(self, obj):
		return obj.created_by.email if obj.created_by else obj.created_by

	def get_updated_by(self, obj):
		return obj.updated_by.email if obj.updated_by else obj.updated_by




class LeaveRequestSerializer(serializers.ModelSerializer):
	class Meta:
		model = LeaveRequest
		fields = '__all__'

	def create(self, validated_data):
		modelObject = super().create(validated_data=validated_data)
		user = get_current_authenticated_user()
		if user is not None:
			modelObject.created_by = user
		modelObject.save()
		return modelObject

	def update(self, instance, validated_data):
		modelObject = super().update(instance=instance, validated_data=validated_data)
		user = get_current_authenticated_user()
		if user is not None:
			modelObject.updated_by = user
		modelObject.save()
		return modelObject




class AvailabilitySerializer(serializers.ModelSerializer):
	class Meta:
		model = Availability
		fields = ['id', 'employee', 'day_of_week', 'is_available', 'start_time', 'end_time', 'note', 'updated_at']
		read_only_fields = ['employee']




class AvailabilityListSerializer(serializers.ModelSerializer):
	employee = EmployeeMinimalListSerializer()

	class Meta:
		model = Availability
		fields = ['id', 'employee', 'day_of_week', 'is_available', 'start_time', 'end_time', 'note', 'updated_at']




class ShiftSwapRequestListSerializer(serializers.ModelSerializer):
	roster = RosterListSerializer()
	requested_by = EmployeeMinimalListSerializer()
	proposed_to = EmployeeMinimalListSerializer()
	claimed_by = EmployeeMinimalListSerializer()
	reviewed_by = serializers.SerializerMethodField()

	class Meta:
		model = ShiftSwapRequest
		fields = '__all__'

	def get_reviewed_by(self, obj):
		return obj.reviewed_by.email if obj.reviewed_by else obj.reviewed_by




class NotificationSerializer(serializers.ModelSerializer):
	class Meta:
		model = Notification
		fields = '__all__'
