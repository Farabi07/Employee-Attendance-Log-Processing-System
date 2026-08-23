from django.db import models
from django.conf import settings
from django.core.mail import send_mail
from django.db.models.signals import post_save
from django.dispatch import receiver
from django.template.loader import render_to_string
from PIL import Image
import requests
from io import BytesIO
from .signals import image_upload_signal,contact_created,subscription_created
import re
# Create your models here.

class CMSMenu(models.Model):
    parent = models.ForeignKey('self', on_delete=models.PROTECT, related_name='children', null=True, blank=True)
    name = models.CharField(max_length=255)
    position = models.IntegerField(unique=True, null=True, blank=True)

    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    created_by = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete= models.SET_NULL, related_name="+", null=True, blank=True)
    updated_by = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete= models.SET_NULL, related_name="+", null=True, blank=True)

    class Meta:
        verbose_name_plural = 'CMSMenus'
        ordering = ('-id', )

    def __str__(self):
        return self.name
    
    def save(self, *args, **kwargs):
        super().save(*args, **kwargs)



class CMSMenuContent(models.Model):
    cms_menu = models.ForeignKey(CMSMenu, on_delete=models.PROTECT, related_name='cms_menu_contents')
    name = models.CharField(max_length=1000,unique=False,null=True,blank=True)
    position = models.IntegerField(null=True, blank=True)
    order = models.IntegerField(null=True, blank=True)
    value = models.TextField(null=True,blank=True)
    description = models.TextField(null=True, blank=True)
    duration = models.CharField(max_length=100,null=True, blank=True)
    languages = models.CharField(max_length=500,null=True, blank=True)
    reviews = models.CharField(max_length=5000,null=True, blank=True)
    additional_info = models.CharField(max_length=5000,null=True, blank=True)
    knw_before_go = models.CharField(max_length=5000,null=True, blank=True)
    group_size = models.CharField(max_length=5000,null=True, blank=True)
    location = models.CharField(max_length=500,null=True, blank=True)
    tag = models.CharField(max_length=500,null=True, blank=True)
    inclution = models.TextField(null=True, blank=True)
    exclusion = models.TextField(null=True, blank=True)
    url = models.CharField(max_length=10000, null=True, blank=True)
    trip_url = models.CharField(max_length=10000, null=True, blank=True)
    price = models.CharField(max_length=100, null=True, blank=True)
    category = models.CharField(max_length=200, null=True, blank=True)
    slug = models.SlugField(max_length=255, unique=True, null=True, blank=True)
    type = models.CharField(max_length=100, null=True, blank=True)
    published = models.BooleanField(default=False,null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)


    created_by = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete= models.SET_NULL, related_name="+", null=True, blank=True)
    updated_by = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete= models.SET_NULL, related_name="+", null=True, blank=True)

    class Meta:
        verbose_name_plural = 'CMSMenuContents'
        ordering = ('id',)

    def __str__(self):
        return self.name

    def save(self, *args, **kwargs):
        if self.name:
            if self.type == 'Tours':
                # Replace special characters (except hyphens) with hyphens
                clean_name = re.sub(r'[^\w\s-]', '-', self.name)

                # Replace spaces with hyphens
                clean_name = re.sub(r'\s+', '-', clean_name)

                # Convert to lowercase
                clean_name = clean_name.lower()

                # Replace multiple consecutive hyphens with a single hyphen
                clean_name = re.sub(r'-{2,}', '-', clean_name)

                # Strip leading and trailing hyphens
                clean_name = clean_name.strip('-')

                slug = clean_name
                counter = 1

                # Ensure slug uniqueness
                while CMSMenuContent.objects.filter(slug=slug).exclude(pk=self.pk).exists():
                    slug = f"{clean_name}-{counter}"
                    counter += 1

                self.slug = slug

        # Handle updated_by and created_by fields
        if not self.pk:  # If it's a new record
            self.created_by = kwargs.pop('user', None)
        else:
            self.updated_by = kwargs.pop('user', None)

        # Call the parent class save method
        super().save(*args, **kwargs)


class CMSMenuContentImage(models.Model):
    cms_menu = models.ForeignKey(CMSMenu, on_delete=models.PROTECT, related_name='cms_menu_content_images')
    head = models.CharField(max_length=500)
    image = models.ImageField(upload_to='cms/ContentImage/',null=True, blank=True)
    cloudflare_image = models.URLField(max_length=500, null=True, blank=True)

    created_at = models.DateTimeField(auto_now_add=True,null=True, blank=True)
    updated_at = models.DateTimeField(auto_now=True,null=True, blank=True)

    created_by = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete= models.SET_NULL, related_name="+", null=True, blank=True)
    updated_by = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete= models.SET_NULL, related_name="+", null=True, blank=True)
    

    class Meta:
        verbose_name_plural = 'CMSMenuContentImages'
        ordering = ('-id', )

    def __str__(self):
        return self.head
        
    def save(self, *args, **kwargs):
        if self.image:
            try:
                self.cloudflare_image = self.upload_cloudflare()
                print("Cloudflare image URL:", self.cloudflare_image)
            except Exception as e:
                print(f"Error uploading image to Cloudflare: {str(e)}")
        super().save(*args, **kwargs)
    def upload_cloudflare(self):
        endpoint = 'https://api.cloudflare.com/client/v4/accounts/f8b413899d5239382d13a2665326b04e/images/v1'
        headers = {
            'Authorization': 'Bearer Ook1HC9KydDm4YfqkmVH5KnoNsSugDDqgLFj4QHi',
        }
        files = {
            'file': self.image.file
        }
        response = requests.post(endpoint, headers=headers, files=files)
        response.raise_for_status()
        json_data = response.json()
        variants = json_data.get('result', {}).get('variants', [])
        if variants:
            cloudflare_image = variants[0]  # Use the first variant URL
            print("Cloudflare image URL from response:", cloudflare_image)
            return cloudflare_image
        else:
            print("No variants found in the Cloudflare response")
            return None







 
#add this
class Itinerary(models.Model):
    cms_content = models.ForeignKey(CMSMenuContent, on_delete=models.PROTECT,null=True,blank=True)
    title = models.CharField(max_length=255)
    description = models.TextField(null=True, blank=True)
    location = models.CharField(max_length=1000, null=True, blank=True)
    lat = models.FloatField(max_length=1000, null=True, blank=True)
    lng = models.FloatField(max_length=1000, null=True, blank=True)
    image = models.ImageField(upload_to='cms/ContentImage/',null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True,null=True)
    updated_at = models.DateTimeField(auto_now=True,null=True)

    created_by = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete= models.SET_NULL, related_name="+", null=True, blank=True)
    updated_by = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete= models.SET_NULL, related_name="+", null=True, blank=True)

    class Meta:
        verbose_name_plural = 'Itinerary'
        ordering = ('id', )

    def __str__(self):
        return f"{self.title}"
    
    def save(self, *args, **kwargs):
        super().save(*args, **kwargs)         


#For Contact



class EmailAddress(models.Model):
    full_name = models.CharField(max_length=255,null=True, blank=True)
    email = models.EmailField(null=False, blank=False)
    phn_num = models.CharField(blank=True, max_length=50, null=True)
    subject = models.CharField(max_length=255,null=True, blank=True)
    message = models.TextField(null=True, blank=True)
    
    class Meta:
        verbose_name_plural = 'Contact'
        ordering = ('-id', )

    def __str__(self):
        return self.email
    
@receiver(post_save, sender=EmailAddress)
def send_email_on_new_signup(sender, instance, created, **kwargs):
    if created:
        # Send contact confirmation email
        subject = 'New Customer Contact With us'
        message = f'Customer Details,\n\n'
        message += f'Full Name: {instance.full_name}\n'
        message += f'Email: {instance.email}\n'
        message += f'Subject: {instance.subject}\n'
        message += f'Message: {instance.message}\n'
        from_email = settings.EMAIL_HOST_USER
        recipient_list = ['info@dreamtourism.it','farhadkabir1212@gmail.com',]
        send_mail(subject, message, from_email, recipient_list)

        # Send feedback email to the sender
        feedback_subject = 'Your Journey Awaits with Dream Tourism'
        feedback_message = render_to_string('contactUs_feedback.html')
        from_email = settings.EMAIL_HOST_USER
        recipient_list = [instance.email]
        send_mail(
            feedback_subject,
            '',
            from_email,
            recipient_list,
            html_message=feedback_message,
        )

#For Subscription

class SendEmail(models.Model):
   
    email = models.EmailField(null=False, blank=False)
    class Meta:
        verbose_name_plural = 'Subscribers'
        ordering = ('-id', )

    def __str__(self):
        return self.email
    
@receiver(post_save, sender=SendEmail)
def send_email(sender, instance, created, **kwargs):
    if created:
        subject = 'New Email Subscription'
        message = render_to_string('subscription_confirmation_email.html', {'email': instance.email})

        from_email = settings.EMAIL_HOST_USER
        recipient_list = ['info@dreamtourism.it','farhadkabir1212@gmail.com', ]
        send_mail(
            subject,
            '',
            from_email,
            recipient_list,
            html_message=message,
        )
        feedback_subject = "Welcome to Dream Tourism's Travel Community!"
        feedback_message = render_to_string('welcome_email.html')

        from_email = settings.EMAIL_HOST_USER
        recipient_list = [instance.email]
        send_mail(
            feedback_subject,
            '',
            from_email,
            recipient_list,
            html_message=feedback_message,
        )




#add this
class Tag(models.Model):
    name = models.CharField(max_length=50, unique=True)

    def __str__(self):
        return self.name




class Blog(models.Model):
    
    title = models.CharField(max_length=255)
    image = models.ImageField(upload_to='cms/BlogImage/',null=True, blank=True)
    cloudflare_image = models.URLField(max_length=500, null=True, blank=True)
    description = models.TextField(null=True, blank=True)
    short_des = models.TextField(null=True, blank=True)
    blog_category = models.CharField(max_length=255)
    date = models.DateField(blank=True)
    # tags = models.CharField( blank=True)
    created_at = models.DateTimeField(auto_now_add=True,null=True)
    updated_at = models.DateTimeField(auto_now=True,null=True)

    created_by = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete= models.SET_NULL, related_name="+", null=True, blank=True)
    updated_by = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete= models.SET_NULL, related_name="+", null=True, blank=True)

    class Meta:
        verbose_name_plural = 'Blog'
        ordering = ('-id', )

    def __str__(self):
        return self.title
    
    def save(self, *args, **kwargs):
        if self.image:
            try:
                self.cloudflare_image = self.upload_cloudflare()
                print("Cloudflare image URL:", self.cloudflare_image)
            except Exception as e:
                print(f"Error uploading image to Cloudflare: {str(e)}")
        super().save(*args, **kwargs)
    def upload_cloudflare(self):
        endpoint = 'https://api.cloudflare.com/client/v4/accounts/f8b413899d5239382d13a2665326b04e/images/v1'
        headers = {
            'Authorization': 'Bearer Ook1HC9KydDm4YfqkmVH5KnoNsSugDDqgLFj4QHi',
        }
        files = {
            'file': self.image.file
        }
        response = requests.post(endpoint, headers=headers, files=files)
        response.raise_for_status()
        json_data = response.json()
        variants = json_data.get('result', {}).get('variants', [])
        if variants:
            cloudflare_image = variants[0]  # Use the first variant URL
            print("Cloudflare image URL from response:", cloudflare_image)
            return cloudflare_image
        else:
            print("No variants found in the Cloudflare response")
            return None

class BlogComments(models.Model):
    
    blog = models.ForeignKey(Blog,on_delete=models.PROTECT,null=True,blank=True)
    full_name = models.CharField(max_length=255)
    email = models.EmailField()
    comment_des = models.TextField()
    phn_num = models.CharField(blank=True, max_length=50, null=True)

    created_at = models.DateTimeField(auto_now_add=True,null=True, blank=True)
    updated_at = models.DateTimeField(auto_now=True,null=True, blank=True)

    created_by = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete= models.SET_NULL, related_name="+", null=True, blank=True)
    updated_by = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete= models.SET_NULL, related_name="+", null=True, blank=True)


    class Meta:
        verbose_name_plural = 'Blog_Comments'
        ordering = ('-id', )

    def __str__(self):
        return self.email
    
    def save(self, *args, **kwargs):
        super().save(*args, **kwargs)       

              
class Review(models.Model):
    supplier = models.CharField(max_length=500, null=True, blank=True)
    reviewer_name = models.CharField(max_length=500, null=True, blank=True)
    image = models.ImageField(upload_to='cms/ReviewImage/',null=True, blank=True)
    # reviewer_picture_url = models.URLField(max_length=500, null=True, blank=True)
    cloudflare_image = models.URLField(max_length=500, null=True, blank=True)
    rating = models.IntegerField(null=True, blank=True)
    text = models.TextField(null=True, blank=True)
    title = models.CharField(max_length=500, null=True, blank=True)
    publication = models.CharField(max_length=500, null=True, blank=True)
    url = models.URLField(max_length=500, null=True, blank=True)

    created_at = models.DateTimeField(auto_now_add=True,null=True, blank=True)
    updated_at = models.DateTimeField(auto_now=True,null=True, blank=True)

    created_by = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete= models.SET_NULL, related_name="+", null=True, blank=True)
    updated_by = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete= models.SET_NULL, related_name="+", null=True, blank=True)


    class Meta:
        verbose_name_plural = 'Review'
        ordering = ('id', )

    def __str__(self):
        return self.title
        
    def save(self, *args, **kwargs):
        if self.image:
            try:
                self.cloudflare_image = self.upload_cloudflare()
                print("Cloudflare image URL:", self.cloudflare_image)
            except Exception as e:
                print(f"Error uploading image to Cloudflare: {str(e)}")
        super().save(*args, **kwargs)
    def upload_cloudflare(self):
        endpoint = 'https://api.cloudflare.com/client/v4/accounts/f8b413899d5239382d13a2665326b04e/images/v1'
        headers = {
            'Authorization': 'Bearer Ook1HC9KydDm4YfqkmVH5KnoNsSugDDqgLFj4QHi',
        }
        files = {
            'file': self.image.file
        }
        response = requests.post(endpoint, headers=headers, files=files)
        response.raise_for_status()
        json_data = response.json()
        variants = json_data.get('result', {}).get('variants', [])
        if variants:
            cloudflare_image = variants[0]  # Use the first variant URL
            print("Cloudflare image URL from response:", cloudflare_image)
            return cloudflare_image
        else:
            print("No variants found in the Cloudflare response")
            return None


class MetaData(models.Model):
    cms_content = models.ForeignKey(CMSMenuContent, on_delete=models.PROTECT,null=True,blank=True)
    meta_title = models.CharField(max_length=255,null=True, blank=True)
    meta_description = models.TextField(null=True, blank=True)
    cloudflare_image = models.URLField(max_length=500, null=True, blank=True)
    image = models.ImageField(upload_to='cms/ContentImage/',null=True, blank=True)
    slug = models.SlugField(max_length=500, unique=True, null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True,null=True)
    updated_at = models.DateTimeField(auto_now=True,null=True)

    created_by = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete= models.SET_NULL, related_name="+", null=True, blank=True)
    updated_by = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete= models.SET_NULL, related_name="+", null=True, blank=True)

    class Meta:
        verbose_name_plural = 'Meta_Data'
        ordering = ('-id', )

    def __str__(self):
        return f"{self.meta_title}"
    
    def save(self, *args, **kwargs):
        # Auto-generate slug from meta_title
        if self.meta_title:
            # Replace special characters (except hyphens) with hyphens
            clean_title = re.sub(r'[^\w\s-]', '-', self.meta_title)

            # Replace spaces with hyphens
            clean_title = re.sub(r'\s+', '-', clean_title)

            # Convert to lowercase
            clean_title = clean_title.lower()

            # Replace multiple consecutive hyphens with a single hyphen
            clean_title = re.sub(r'-{2,}', '-', clean_title)

            # Strip leading and trailing hyphens
            clean_title = clean_title.strip('-')

            slug = clean_title
            counter = 1

            # Ensure slug uniqueness
            while MetaData.objects.filter(slug=slug).exclude(pk=self.pk).exists():
                slug = f"{clean_title}-{counter}"
                counter += 1

            self.slug = slug

        # Handle updated_by and created_by fields
        if not self.pk:  # If it's a new record
            self.created_by = kwargs.pop('user', None)
        else:
            self.updated_by = kwargs.pop('user', None)

        # Call the parent class save method
        super().save(*args, **kwargs)

        # Signal to handle image upload (if any)
        if self.image:
            image_upload_signal.send(sender=self.__class__, instance=self)
