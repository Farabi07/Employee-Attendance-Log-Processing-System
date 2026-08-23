from django.contrib.auth import get_user_model
from django.db.models.signals import post_save
from django.contrib.auth.signals import user_logged_in, user_logged_out

from django_currentuser.middleware import get_current_authenticated_user


###
from django.dispatch import Signal, receiver
import requests
from django.template.loader import render_to_string
from django.conf import settings
from django.core.mail import send_mail
from .models import *

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


# #CMSMenu signals
post_save.connect(created_by_signals, sender='cms.CMSMenu')
post_save.connect(updated_by_signals, sender='cms.CMSMenu')


#TicketPriority signals
post_save.connect(created_by_signals, sender='cms.CMSMenuContent')
post_save.connect(updated_by_signals, sender='cms.CMSMenuContent')


# TicketStatus signals
post_save.connect(created_by_signals, sender='cms.CMSMenuContentImage')
post_save.connect(updated_by_signals, sender='cms.CMSMenuContentImage')

post_save.connect(created_by_signals, sender='cms.Itinerary')
post_save.connect(updated_by_signals, sender='cms.Itinerary')

post_save.connect(created_by_signals, sender='cms.EmailAddress')
post_save.connect(updated_by_signals, sender='cms.EmailAddress')

post_save.connect(created_by_signals, sender='cms.SendEmail')
post_save.connect(updated_by_signals, sender='cms.SendEmail')

post_save.connect(created_by_signals, sender='cms.Blog')
post_save.connect(updated_by_signals, sender='cms.Blog')

post_save.connect(created_by_signals, sender='cms.BlogComments')
post_save.connect(updated_by_signals, sender='cms.BlogComments')

post_save.connect(created_by_signals, sender='cms.Review')
post_save.connect(updated_by_signals, sender='cms.Review')




#########
# Define custom signal
# image_upload_signal = Signal(providing_args=["instance"])

image_upload_signal = Signal()
contact_created = Signal()
subscription_created = Signal()

@receiver(image_upload_signal)
def handle_image_upload(sender, instance, **kwargs):
    if instance.image:
        try:
            endpoint = 'https://api.cloudflare.com/client/v4/accounts/f8b413899d5239382d13a2665326b04e/images/v1'
            headers = {
                'Authorization': 'Bearer Ook1HC9KydDm4YfqkmVH5KnoNsSugDDqgLFj4QHi',
            }
            files = {
                'file': instance.image.file
            }
            response = requests.post(endpoint, headers=headers, files=files)
            response.raise_for_status()
            json_data = response.json()
            variants = json_data.get('result', {}).get('variants', [])
            if variants:
                cloudflare_image = variants[0]
                instance.cloudflare_image = cloudflare_image
                instance.save(update_fields=['cloudflare_image'])
                return cloudflare_image
            else:
                print("No variants found in the Cloudflare response")
                return None
        except Exception as e:
            print(f"Error uploading image to Cloudflare: {str(e)}")


@receiver(contact_created)
def send_contact_email(sender, instance, created, **kwargs):
    if created:
        subject = 'New Customer Contact With us'
        message = f'Customer Details,\n\n'
        message += f'Full Name: {instance.full_name}\n'
        message += f'Email: {instance.email}\n'
        message += f'Subject: {instance.subject}\n'
        message += f'Message: {instance.message}\n'
        from_email = settings.EMAIL_HOST_USER
        recipient_list = ['farhadkabir1212@gmail.com',]
        send_mail(subject, message, from_email, recipient_list)

        # Send feedback email to the sender
        feedback_subject = 'Your Journey Awaits with Dream Tourism'
        feedback_message = render_to_string('contactUs_feedback.html')
        send_mail(
            feedback_subject,
            '',
            from_email,
            [instance.email],
            html_message=feedback_message,
        )


@receiver(subscription_created)
def send_subscription_email(sender, instance, created, **kwargs):
    if created:
        subject = 'New Email Subscription'
        message = render_to_string('subscription_confirmation_email.html', {'email': instance.email})

        from_email = settings.EMAIL_HOST_USER
        recipient_list = ['farhadkabir1212@gmail.com', ]
        send_mail(
            subject,
            '',
            from_email,
            recipient_list,
            html_message=message,
        )
        feedback_subject = "Welcome to Dream Tourism's Travel Community!"
        feedback_message = render_to_string('welcome_email.html')

        send_mail(
            feedback_subject,
            '',
            from_email,
            [instance.email],
            html_message=feedback_message,
        )