from django.contrib import admin

from .models import Expense


@admin.register(Expense)
class ExpenseAdmin(admin.ModelAdmin):
    list_display = ("date", "category", "amount", "organization", "recipient", "source")
    list_filter = ("category", "source", "date")
