from rest_framework import serializers

from wallet.models import WalletTransaction


class EmployeeMinimalSerializer(serializers.Serializer):
	id = serializers.IntegerField()
	first_name = serializers.CharField()
	last_name = serializers.CharField()
	email = serializers.CharField()


class WalletTransactionSerializer(serializers.ModelSerializer):
	employee = EmployeeMinimalSerializer(read_only=True)

	class Meta:
		model = WalletTransaction
		fields = [
			'id', 'transaction_id', 'employee', 'type', 'status', 'amount',
			'related_attendance', 'batch_id', 'stripe_transfer_id', 'failure_reason',
			'note', 'created_at', 'processed_at',
		]
