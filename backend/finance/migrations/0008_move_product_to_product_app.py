from django.db import migrations


class Migration(migrations.Migration):
    dependencies = [
        ("expense", "0007_product"),
    ]

    operations = [
        migrations.SeparateDatabaseAndState(
            state_operations=[migrations.DeleteModel(name="Product")],
            database_operations=[],
        ),
    ]
