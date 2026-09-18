from django.conf import settings
from django.db import migrations, models
import django.db.models.deletion


class Migration(migrations.Migration):
    dependencies = [
        ("expense", "0006_alter_expense_category"),
        migrations.swappable_dependency(settings.AUTH_USER_MODEL),
    ]

    operations = [
        migrations.CreateModel(
            name="Product",
            fields=[
                ("id", models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name="ID")),
                ("name", models.CharField(max_length=160)),
                ("category", models.CharField(max_length=80)),
                ("description", models.TextField(blank=True)),
                ("image", models.ImageField(blank=True, null=True, upload_to="products/%Y/%m/")),
                ("price", models.DecimalField(decimal_places=2, max_digits=12)),
                ("offer_price", models.DecimalField(blank=True, decimal_places=2, max_digits=12, null=True)),
                ("offer_active", models.BooleanField(default=False)),
                ("is_available", models.BooleanField(default=True)),
                ("sku", models.CharField(blank=True, max_length=80)),
                ("created_at", models.DateTimeField(auto_now_add=True)),
                ("updated_at", models.DateTimeField(auto_now=True)),
                ("branch", models.ForeignKey(blank=True, null=True, on_delete=django.db.models.deletion.SET_NULL, related_name="products", to="authentication.branch")),
                ("created_by", models.ForeignKey(blank=True, null=True, on_delete=django.db.models.deletion.SET_NULL, related_name="+", to=settings.AUTH_USER_MODEL)),
                ("organization", models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name="products", to="authentication.organization")),
            ],
            options={"ordering": ("category", "name")},
        ),
        migrations.AddIndex(
            model_name="product",
            index=models.Index(fields=("organization", "category", "is_available"), name="expense_pro_organiz_8c41ae_idx"),
        ),
    ]
