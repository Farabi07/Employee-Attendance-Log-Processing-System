from django.contrib.auth import get_user_model
from django.db.models.signals import post_save
from django.contrib.auth.signals import user_logged_in, user_logged_out

from django_currentuser.middleware import get_current_authenticated_user

from support.models import *

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




# TicketDepartment signals
post_save.connect(created_by_signals, sender=TicketDepartment)
post_save.connect(updated_by_signals, sender=TicketDepartment)


# TicketPriority signals
post_save.connect(created_by_signals, sender=TicketPriority)
post_save.connect(updated_by_signals, sender=TicketPriority)


# TicketStatus signals
post_save.connect(created_by_signals, sender=TicketStatus)
post_save.connect(updated_by_signals, sender=TicketStatus)


# Ticket signals
post_save.connect(created_by_signals, sender=Ticket)
post_save.connect(updated_by_signals, sender=Ticket)


# TicketDetail signals
post_save.connect(created_by_signals, sender=TicketDetail)
post_save.connect(updated_by_signals, sender=TicketDetail)


# Message signals
post_save.connect(created_by_signals, sender=Message)
post_save.connect(updated_by_signals, sender=Message)


# TaskType signals
post_save.connect(created_by_signals, sender=TaskType)
post_save.connect(updated_by_signals, sender=TaskType)


# ToDoTask signals
post_save.connect(created_by_signals, sender=ToDoTask)
post_save.connect(updated_by_signals, sender=ToDoTask)