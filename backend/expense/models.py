from django.conf import settings
from django.db import models
from django.utils import timezone

from authentication.models import Branch, Employee, Organization


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
    amount = models.DecimalField(max_digits=12, decimal_places=2)
    category = models.CharField(max_length=30, choices=Category.choices, default=Category.OTHER)
    description = models.CharField(max_length=255, blank=True)
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
