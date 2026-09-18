from django.conf import settings
from django.db import migrations, models
import django.db.models.deletion
import django.utils.timezone


class Migration(migrations.Migration):
    initial = True
    dependencies = [
        migrations.swappable_dependency(settings.AUTH_USER_MODEL),
        ("authentication", "0017_user_silent_mode"),
    ]
    operations = [
        migrations.CreateModel(
            name="Expense",
            fields=[
                ("id", models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name="ID")),
                ("amount", models.DecimalField(decimal_places=2, max_digits=12)),
                ("category", models.CharField(choices=[("supplies", "Supplies"), ("rent", "Rent"), ("utilities", "Utilities"), ("transport", "Transport"), ("marketing", "Marketing"), ("salary", "Salary"), ("other", "Other")], default="other", max_length=30)),
                ("description", models.CharField(blank=True, max_length=255)),
                ("date", models.DateField(db_index=True, default=django.utils.timezone.localdate)),
                ("source", models.CharField(default="direct", max_length=20)),
                ("created_at", models.DateTimeField(auto_now_add=True)),
                ("branch", models.ForeignKey(blank=True, null=True, on_delete=django.db.models.deletion.SET_NULL, related_name="expenses", to="authentication.branch")),
                ("created_by", models.ForeignKey(blank=True, null=True, on_delete=django.db.models.deletion.SET_NULL, related_name="+", to=settings.AUTH_USER_MODEL)),
                ("organization", models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name="expenses", to="authentication.organization")),
                ("recipient", models.ForeignKey(blank=True, null=True, on_delete=django.db.models.deletion.SET_NULL, related_name="received_expenses", to="authentication.employee")),
            ],
            options={"ordering": ("-date", "-id")},
        ),
        migrations.AddIndex(model_name="expense", index=models.Index(fields=["organization", "date"], name="expense_exp_organiz_eaaf33_idx")),
        migrations.AddIndex(model_name="expense", index=models.Index(fields=["organization", "category", "date"], name="expense_exp_organiz_aafd18_idx")),
    ]
