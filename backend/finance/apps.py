from django.apps import AppConfig


class FinanceConfig(AppConfig):
    default_auto_field = "django.db.models.BigAutoField"
    name = "finance"
    # Preserve the existing migration/table namespace while the Python app
    # gets the domain-appropriate business name.
    label = "expense"
