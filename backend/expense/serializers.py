from rest_framework import serializers

from authentication.models import Employee
from .models import Expense, Income


class RecipientSerializer(serializers.ModelSerializer):
    class Meta:
        model = Employee
        fields = ("id", "first_name", "last_name", "email")


class ExpenseSerializer(serializers.ModelSerializer):
    recipient = RecipientSerializer(read_only=True)
    recipient_id = serializers.IntegerField(write_only=True, required=False, allow_null=True)

    class Meta:
        model = Expense
        fields = ("id", "amount", "category", "description", "date", "source", "recipient", "recipient_id", "branch", "created_at")
        read_only_fields = ("id", "source", "branch", "created_at")

    def validate_recipient_id(self, value):
        request = self.context["request"]
        if value is None:
            return value
        if not Employee.objects.filter(pk=value, organization=request.user.organization).exists():
            raise serializers.ValidationError("Recipient is not a member of this store.")
        return value


class IncomeSerializer(serializers.ModelSerializer):
    class Meta:
        model = Income
        fields = ("id", "amount", "category", "description", "date", "source", "branch", "created_at")
        read_only_fields = ("id", "source", "branch", "created_at")
