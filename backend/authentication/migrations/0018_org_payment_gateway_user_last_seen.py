from django.db import migrations, models


class Migration(migrations.Migration):
    dependencies = [
        ('authentication', '0017_user_silent_mode'),
    ]

    operations = [
        migrations.AddField(
            model_name='organization',
            name='payment_gateway',
            field=models.CharField(default='stripe', max_length=20),
        ),
        migrations.AddField(
            model_name='user',
            name='last_seen_at',
            field=models.DateTimeField(blank=True, null=True),
        ),
    ]
