from rest_framework import serializers

from authentication.models import Employee
from .models import Expense, ExpenseCategory, Income


class RecipientSerializer(serializers.ModelSerializer):
    class Meta:
        model = Employee
        fields = ("id", "first_name", "last_name", "email")


class ExpenseCategorySerializer(serializers.ModelSerializer):
    class Meta:
        model = ExpenseCategory
        fields = ("id", "name", "is_active", "created_at")
        read_only_fields = ("id", "created_at")

    def validate_name(self, value):
        name = str(value).strip()
        if not name:
            raise serializers.ValidationError("Category name is required.")
        if name.lower() == "profit":
            raise serializers.ValidationError("Profit is a result, not an expense category.")
        return name


class ExpenseSerializer(serializers.ModelSerializer):
    recipient = RecipientSerializer(read_only=True)
    recipient_id = serializers.IntegerField(write_only=True, required=False, allow_null=True)
    category_id = serializers.PrimaryKeyRelatedField(source="category_ref", queryset=ExpenseCategory.objects.none(), write_only=True, required=False, allow_null=True)
    category_name = serializers.CharField(source="category_ref.name", read_only=True)

    class Meta:
        model = Expense
        fields = ("id", "amount", "category", "category_id", "category_name", "description", "vendor_name", "uploaded_receipt", "payment_method", "date", "source", "recipient", "recipient_id", "branch", "created_at")
        read_only_fields = ("id", "source", "branch", "created_at")

    def validate_category(self, value):
        normalized = str(value).strip().lower()
        if not normalized:
            raise serializers.ValidationError("Category is required.")
        if normalized == "profit":
            raise serializers.ValidationError("Profit is calculated from income minus expenses; it is not an expense category.")
        return normalized

    def validate_recipient_id(self, value):
        request = self.context["request"]
        if value is None:
            return value
        if not Employee.objects.filter(pk=value, organization=request.user.organization).exists():
            raise serializers.ValidationError("Recipient is not a member of this store.")
        return value

    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)
        request = self.context.get("request")
        if request and getattr(request.user, "organization_id", None):
            self.fields["category_id"].queryset = ExpenseCategory.objects.filter(organization=request.user.organization, is_active=True)


class IncomeSerializer(serializers.ModelSerializer):
    class Meta:
        model = Income
        fields = ("id", "amount", "category", "description", "date", "source", "branch", "created_at")
        read_only_fields = ("id", "source", "branch", "created_at")
