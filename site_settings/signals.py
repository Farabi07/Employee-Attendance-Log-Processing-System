from django.contrib.auth import get_user_model
from django.db.models.signals import post_save

from django_currentuser.middleware import get_current_authenticated_user

from site_settings.models import *




User = get_user_model()



def created_by_signals(sender, instance, created, **kwargs):
	if created:
		user = get_current_authenticated_user()
		if user is not None:
			sender.objects.filter(id=instance.id).update(created_by=user)


def updated_by_signals(sender, instance, created, **kwargs):
	if not created:
		user = get_current_authenticated_user()
		if user is not None:
			sender.objects.filter(id=instance.id).update(updated_by=user)




# MenuItem signals
post_save.connect(created_by_signals, sender=MenuItem)
post_save.connect(updated_by_signals, sender=MenuItem)


# RoleMenu signals
post_save.connect(created_by_signals, sender=RoleMenu)
post_save.connect(updated_by_signals, sender=RoleMenu)


# GeneralSetting signals
post_save.connect(created_by_signals, sender=GeneralSetting)
post_save.connect(updated_by_signals, sender=GeneralSetting)


# HomePageSlider signals
post_save.connect(created_by_signals, sender=HomePageSlider)
post_save.connect(updated_by_signals, sender=HomePageSlider)


# Contact signals
post_save.connect(created_by_signals, sender=Contact)
post_save.connect(updated_by_signals, sender=Contact)
