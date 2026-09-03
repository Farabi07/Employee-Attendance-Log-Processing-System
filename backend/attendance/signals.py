from django.db.models.signals import post_save
from django.dispatch import receiver

from attendance.models import Notification
from attendance.push import send_expo_push_for_notification


@receiver(post_save, sender=Notification)
def push_on_notification_created(sender, instance, created, **kwargs):
	if created:
		send_expo_push_for_notification(instance)
