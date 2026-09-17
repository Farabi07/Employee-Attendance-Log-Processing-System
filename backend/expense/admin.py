from django.contrib import admin

from .models import Expense, ExpenseCategory, FinanceAuditLog


@admin.register(FinanceAuditLog)
class FinanceAuditLogAdmin(admin.ModelAdmin):
    list_display = ("created_at", "organization", "actor", "entity_type", "entity_id", "action")
    list_filter = ("entity_type", "action", "created_at")
    readonly_fields = ("created_at",)


@admin.register(ExpenseCategory)
class ExpenseCategoryAdmin(admin.ModelAdmin):
    list_display = ("name", "organization", "is_active")
    list_filter = ("is_active",)


@admin.register(Expense)
class ExpenseAdmin(admin.ModelAdmin):
    list_display = ("date", "category", "amount", "organization", "recipient", "source")
    list_filter = ("category", "source", "date")
