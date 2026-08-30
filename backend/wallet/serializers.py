from rest_framework import serializers

from wallet.models import WalletTransaction, RateHistory, PayAdjustmentRequest


class EmployeeMinimalSerializer(serializers.Serializer):
	id = serializers.IntegerField()
	first_name = serializers.CharField()
	last_name = serializers.CharField()
	email = serializers.CharField()


class WalletTransactionSerializer(serializers.ModelSerializer):
	employee = EmployeeMinimalSerializer(read_only=True)
	currency = serializers.SerializerMethodField()

	class Meta:
		model = WalletTransaction
		fields = [
			'id', 'transaction_id', 'employee', 'type', 'status', 'amount', 'currency',
			'related_attendance', 'batch_id', 'stripe_transfer_id', 'failure_reason',
			'note', 'created_at', 'processed_at',
		]

	def get_currency(self, obj):
		# obj.employee is a plain User row (the FK targets AUTH_USER_MODEL) —
		# currency only exists on the Employee subclass, so it has to be
		# looked up explicitly rather than read straight off the FK.
		from authentication.models import Employee
		try:
			return Employee.objects.get(pk=obj.employee_id).currency
		except Employee.DoesNotExist:
			return None


class ChangedByMinimalSerializer(serializers.Serializer):
	id = serializers.IntegerField()
	first_name = serializers.CharField()
	last_name = serializers.CharField()


class RateHistorySerializer(serializers.ModelSerializer):
	changed_by = ChangedByMinimalSerializer(read_only=True)

	class Meta:
		model = RateHistory
		fields = ['id', 'old_hourly_rate', 'new_hourly_rate', 'old_currency', 'new_currency', 'changed_by', 'created_at']


class PayAdjustmentRequestSerializer(serializers.ModelSerializer):
	employee = EmployeeMinimalSerializer(read_only=True)
	reviewed_by = ChangedByMinimalSerializer(read_only=True)
	attendance_date = serializers.DateField(source='attendance.date', read_only=True)
	currency = serializers.SerializerMethodField()

	class Meta:
		model = PayAdjustmentRequest
		fields = [
			'id', 'employee', 'attendance', 'attendance_date', 'kind', 'hours', 'requested_amount',
			'note', 'attachment', 'status', 'granted_amount', 'manager_note', 'currency',
			'reviewed_by', 'reviewed_at', 'accepted_at', 'created_at',
		]

	def get_currency(self, obj):
		from authentication.models import Employee
		try:
			return Employee.objects.get(pk=obj.employee_id).currency
		except Employee.DoesNotExist:
			return None
