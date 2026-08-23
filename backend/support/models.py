from django.db import models
from django.conf import settings
from django.contrib.auth.signals import user_logged_in, user_logged_out

from rest_framework.serializers import BaseSerializer, ModelSerializer

from authentication.models import User

from PIL import Image

from utils.image_processing import ALL_IMAGE_FORMAT_LIST





class LoggedUser(models.Model):
    user = models.ForeignKey(User, on_delete=models.CASCADE)

    class Meta:
        verbose_name_plural = 'LoggedUsers'

    def __unicode__(self):
        return self.user.username

    def login_user(sender, request, user, **kwargs):
        try:
            u = LoggedUser.objects.get(user=user)
        except LoggedUser.DoesNotExist:
            LoggedUser(user=user).save()

    def logout_user(sender, request, user, **kwargs):
        try:
            u = LoggedUser.objects.get(user=user)
            u.delete()
        except LoggedUser.DoesNotExist:
            pass

    user_logged_in.connect(login_user)
    user_logged_out.connect(logout_user)





# Create your models here.
class TicketDepartment(models.Model):
    name = models.CharField(max_length=200)

    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    created_by = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete= models.SET_NULL, related_name="+", null=True, blank=True)
    updated_by = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete= models.SET_NULL, related_name="+", null=True, blank=True)

    class Meta:
        verbose_name_plural = 'TicketDepartments'
        ordering = ('-id', )

    def __str__(self):
        return self.name
	
    def save(self, *args, **kwargs):
        self.name = self.name.replace(' ', '_').lower()
        super().save(*args, **kwargs)




class TicketPriority(models.Model):
    name = models.CharField(max_length=200)

    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    created_by = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete= models.SET_NULL, related_name="+", null=True, blank=True)
    updated_by = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete= models.SET_NULL, related_name="+", null=True, blank=True)

    class Meta:
        verbose_name_plural = 'TicketPriorities'
        ordering = ('-id', )

    def __str__(self):
        return self.name

    def save(self, *args, **kwargs):
        self.name = self.name.replace(' ', '_').lower()
        super().save(*args, **kwargs)




class TicketStatus(models.Model):
    name = models.CharField(max_length=200)

    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    created_by = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete= models.SET_NULL, related_name="+", null=True, blank=True)
    updated_by = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete= models.SET_NULL, related_name="+", null=True, blank=True)

    class Meta:
        verbose_name_plural = 'TicketStatuses'
        ordering = ('-id', )

    def __str__(self):
        return self.name

    def save(self, *args, **kwargs):
        self.name = self.name.replace(' ', '_').lower()
        super().save(*args, **kwargs)




class Ticket(models.Model):
    subject = models.CharField(max_length=500, null=True, blank=True)

    user = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE)

    ticket_department = models.ForeignKey(TicketDepartment, on_delete=models.SET_NULL, null=True, blank=True)
    ticket_priority = models.ForeignKey(TicketPriority, on_delete=models.SET_NULL, null=True, blank=True)
    ticket_status = models.ForeignKey(TicketStatus, on_delete=models.SET_NULL, null=True, blank=True)

    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    created_by = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete= models.SET_NULL, related_name="+", null=True, blank=True)
    updated_by = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete= models.SET_NULL, related_name="+", null=True, blank=True)

    class Meta:
        ordering = ('-id', )

    def __str__(self):
        return str(self.id)

    def save(self, *args, **kwargs):
        super().save(*args, **kwargs)      




class TicketDetail(models.Model):
    ticket = models.ForeignKey(Ticket, on_delete=models.CASCADE, null=True, blank=True)

    admin = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.SET_NULL, related_name="+", null=True, blank=True)
    customer = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.SET_NULL, related_name="+", null=True, blank=True)

    message = models.TextField()

    file = models.FileField(upload_to='ticketFiles/', null=True, blank=True)

    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    created_by = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete= models.SET_NULL, related_name="+", null=True, blank=True)
    updated_by = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete= models.SET_NULL, related_name="+", null=True, blank=True)

    class Meta:
        ordering = ['created_at']
        verbose_name_plural = 'TicketDetails'

    def __str__(self):
        return str(self.id)

    def save(self, *args, **kwargs):
        super().save(*args, **kwargs)   
        if self.file:
            max_width, max_height = 750, 1000
            path = self.file.path
            try:
                file = Image.open(path)
                file_format = file.format
                print('file_format: ', file_format)
                if file_format in ALL_IMAGE_FORMAT_LIST:
                    print('inside all file format')
                    width, height = file.size
                    if width > max_width or height > max_height:
                        if width > height:
                            w_h = (1000, 750)
                        elif height > width:
                            w_h = (750, 1000)
                        img = file.resize(w_h)
                        img.save(path)
            except Exception:
                pass




class Message(models.Model):
    sender = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name="+")
    receiver = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name="+")

    seen = models.BooleanField(default=False)
    message = models.TextField(null=True, blank=True)
    file = models.FileField(upload_to='messageFiles/', null=True, blank=True)

    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    created_by = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete= models.SET_NULL, related_name="+", null=True, blank=True)
    updated_by = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete= models.SET_NULL, related_name="+", null=True, blank=True)

    class Meta:
        ordering = ['-created_at']
        verbose_name_plural = 'Messages'

    def __str__(self):
        return str(self.id)

    def save(self, *args, **kwargs):
        super().save(*args, **kwargs)
        if self.file:
            max_width, max_height = 750, 1000
            path = self.file.path
            try:
                file = Image.open(path)
                file_format = file.format
                print('file_format: ', file_format)
                if file_format in ALL_IMAGE_FORMAT_LIST:
                    print('inside all file format')
                    width, height = file.size
                    if width > max_width or height > max_height:
                        if width > height:
                            w_h = (1000, 750)
                        elif height > width:
                            w_h = (750, 1000)
                        img = file.resize(w_h)
                        img.save(path)
            except Exception:
                pass 




class TaskType(models.Model):
    name = models.CharField(max_length=255)

    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    created_by = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete= models.SET_NULL, related_name="+", null=True, blank=True)
    updated_by = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete= models.SET_NULL, related_name="+", null=True, blank=True)

    class Meta:
        ordering = ['-id']
        verbose_name_plural = 'TaskTypes'

    def __str__(self):
        return str(self.id)




class ToDoTask(models.Model):
    user = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.RESTRICT, related_name='user_todo_tasks')
    task_type = models.ForeignKey(TaskType, on_delete=models.CASCADE, related_name='type_todo_task')

    title = models.CharField(max_length=500)
    is_completed = models.BooleanField(default=False)
    is_emergency = models.BooleanField(default=False)
    note = models.TextField(null=True, blank=True)

    from_date = models.DateTimeField()
    to_date = models.DateTimeField()

    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    created_by = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete= models.SET_NULL, related_name="+", null=True, blank=True)
    updated_by = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete= models.SET_NULL, related_name="+", null=True, blank=True)

    class Meta:
        ordering = ['-created_at']
        verbose_name_plural = 'ToDoTasks'

    def __str__(self):
        return str(self.id)



