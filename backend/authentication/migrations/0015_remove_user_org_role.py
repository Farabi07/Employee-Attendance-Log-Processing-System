from django.db import migrations


class Migration(migrations.Migration):

    dependencies = [
        ('authentication', '0014_populate_user_role_from_org_role'),
    ]

    operations = [
        migrations.RemoveField(
            model_name='user',
            name='org_role',
        ),
    ]
