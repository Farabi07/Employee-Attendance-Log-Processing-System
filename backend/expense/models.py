from django.conf import settings
from django.db import models
from django.utils import timezone

from authentication.models import Branch, Employee, Organization


class FinanceAuditLog(models.Model):
    organization = models.ForeignKey(Organization, on_delete=models.CASCADE, related_name="finance_audit_logs")
    actor = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.SET_NULL, null=True, related_name="finance_audit_logs")
    entity_type = models.CharField(max_length=30)
    entity_id = models.PositiveBigIntegerField(null=True, blank=True)
    action = models.CharField(max_length=20)
    changes = models.JSONField(default=dict, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ("-created_at",)
        indexes = [models.Index(fields=("organization", "created_at"))]


class ExpenseCategory(models.Model):
    organization = models.ForeignKey(Organization, on_delete=models.CASCADE, related_name="expense_categories")
    name = models.CharField(max_length=80)
    is_active = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ("name",)
        constraints = [models.UniqueConstraint(fields=("organization", "name"), name="expense_category_org_name_uniq")]

    def __str__(self):
        return self.name


class Expense(models.Model):
    class Category(models.TextChoices):
        SUPPLIES = "supplies", "Supplies"
        RENT = "rent", "Rent"
        UTILITIES = "utilities", "Utilities"
        TRANSPORT = "transport", "Transport"
        MARKETING = "marketing", "Marketing"
        SALARY = "salary", "Salary"
        OTHER = "other", "Other"

    organization = models.ForeignKey(Organization, on_delete=models.CASCADE, related_name="expenses")
    branch = models.ForeignKey(Branch, on_delete=models.SET_NULL, null=True, blank=True, related_name="expenses")
    recipient = models.ForeignKey(Employee, on_delete=models.SET_NULL, null=True, blank=True, related_name="received_expenses")
    category_ref = models.ForeignKey(ExpenseCategory, on_delete=models.SET_NULL, null=True, blank=True, related_name="expenses")
    amount = models.DecimalField(max_digits=12, decimal_places=2)
    category = models.CharField(max_length=30, choices=Category.choices, default=Category.OTHER)
    description = models.CharField(max_length=255, blank=True)
    vendor_name = models.CharField(max_length=160, blank=True)
    uploaded_receipt = models.ImageField(upload_to="expense-receipts/%Y/%m/", blank=True, null=True)
    payment_method = models.CharField(max_length=30, default="cash")
    date = models.DateField(default=timezone.localdate, db_index=True)
    source = models.CharField(max_length=20, default="direct")
    created_by = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.SET_NULL, null=True, blank=True, related_name="+")
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ("-date", "-id")
        indexes = [
            models.Index(fields=("organization", "date")),
            models.Index(fields=("organization", "category", "date")),
        ]

    def __str__(self):
        return f"{self.category}: {self.amount} ({self.date})"


class Income(models.Model):
    organization = models.ForeignKey(Organization, on_delete=models.CASCADE, related_name="business_income")
    branch = models.ForeignKey(Branch, on_delete=models.SET_NULL, null=True, blank=True, related_name="business_income")
    amount = models.DecimalField(max_digits=12, decimal_places=2)
    category = models.CharField(max_length=30, default="sales")
    description = models.CharField(max_length=255, blank=True)
    date = models.DateField(default=timezone.localdate, db_index=True)
    source = models.CharField(max_length=20, default="direct")
    created_by = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.SET_NULL, null=True, blank=True, related_name="+")
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ("-date", "-id")
        indexes = [models.Index(fields=("organization", "date"))]
