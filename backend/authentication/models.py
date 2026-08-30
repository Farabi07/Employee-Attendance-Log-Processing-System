from enum import unique
from operator import truediv
from statistics import mode
from datetime import timedelta
from django.db import models
from django.db.models.fields import BigAutoField
from django.utils import tree
from django.utils import timezone
from django.utils.translation import gettext_lazy as _
from django.contrib.auth.hashers import make_password
from django.contrib.auth.models import AbstractBaseUser, BaseUserManager
from django.conf import settings

from phonenumber_field.modelfields import PhoneNumberField

from PIL import Image
from rest_framework.serializers import BaseSerializer

from commons.currencies import CURRENCY_CHOICES




class Permission(models.Model):
    name = models.CharField(max_length=255)

    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    created_by = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete= models.SET_NULL, related_name="+", null=True, blank=True)
    updated_by = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete= models.SET_NULL, related_name="+", null=True, blank=True)

    class Meta:
        ordering = ('name',)

    def __str__(self):
        return self.name
    
    def save(self, *args, **kwargs):
        self.name = self.name.replace(' ', '_').upper()
        super().save(*args, **kwargs)




class Role(models.Model):
    name = models.CharField(max_length=255)
    permissions = models.ManyToManyField(Permission, blank=True)

    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    created_by = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete= models.SET_NULL, related_name="+", null=True, blank=True)

    updated_by = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete= models.SET_NULL, related_name="+", null=True, blank=True)
    
    class Meta:
        ordering = ('name',)

    def __str__(self):
        return self.name
    
    def save(self, *args, **kwargs):
        self.name = self.name.replace(' ', '_').upper()
        super().save(*args, **kwargs)




class Designation(models.Model):
    name = models.CharField(max_length=255)
    
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    created_by = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete= models.SET_NULL, related_name="+", null=True, blank=True)
    updated_by = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete= models.SET_NULL, related_name="+", null=True, blank=True)

    class Meta:
        ordering = ('name',)

    def __str__(self):
        return self.name
    
    def save(self, *args, **kwargs):
        self.name = self.name.title()
        super().save(*args, **kwargs)




class Country(models.Model):
    name = models.CharField(max_length=255)
    capital_name = models.CharField(max_length=255, null=True, blank=True)
    country_code = models.CharField(max_length=255, null=True, blank=True)
    country_code2 = models.CharField(max_length=255, null=True, blank=True)
    phone_code = models.CharField(max_length=255, null=True, blank=True)
    currency_code = models.CharField(max_length=255, null=True, blank=True)
    continent_name = models.CharField(max_length=255, null=True, blank=True)
    continent_code = models.CharField(max_length=255, null=True, blank=True)

    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    created_by = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete= models.SET_NULL, related_name="+", null=True, blank=True)
    updated_by = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete= models.SET_NULL, related_name="+", null=True, blank=True)

    class Meta:
        ordering = ('name',)
        verbose_name_plural = 'Countries'

    def __str__(self):
        return self.name




class City(models.Model):
    name = models.CharField(max_length=50)
    bn_name = models.CharField(max_length=50, null=True, blank=True)

    lat = models.CharField(max_length=255, null=True, blank=True)
    lon = models.CharField(max_length=255, null=True, blank=True)

    url = models.CharField(max_length=500, null=True, blank=True)

    country = models.ForeignKey(Country, on_delete= models.RESTRICT, related_name='cities')

    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    created_by = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete= models.SET_NULL, related_name="+", null=True, blank=True)
    updated_by = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete= models.SET_NULL, related_name="+", null=True, blank=True)

    class Meta:
        ordering = ('id',)
        verbose_name_plural = 'Cities'

    def __str__(self):
        return self.name
    
    def save(self, *args, **kwargs):
        self.name = self.name.capitalize()
        super().save(*args, **kwargs)




class Thana(models.Model):
    name = models.CharField(max_length=50)
    bn_name = models.CharField(max_length=50, null=True, blank=True)

    url = models.CharField(max_length=500, null=True, blank=True)

    city = models.ForeignKey(City, on_delete= models.RESTRICT, related_name='thanas')

    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    created_by = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete= models.SET_NULL, related_name="+", null=True, blank=True)
    updated_by = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete= models.SET_NULL, related_name="+", null=True, blank=True)

    class Meta:
        ordering = ('id',)

    def __str__(self):
        return self.name
    
    def save(self, *args, **kwargs):
        self.name = self.name.capitalize()
        super().save(*args, **kwargs)




class Area(models.Model):
    name = models.CharField(max_length=50)

    short_desc = models.TextField(blank=True, null=True)
    full_desc = models.TextField(blank=True, null=True)

    thana = models.ForeignKey(Thana, on_delete=models.RESTRICT, null=True, related_name='areas')
    city = models.ForeignKey(City, on_delete= models.RESTRICT, null=True, blank=True)
    country = models.ForeignKey(Country, on_delete= models.RESTRICT, null=True, blank=True)

    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    created_by = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete= models.SET_NULL, related_name="+", null=True, blank=True)
    updated_by = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete= models.SET_NULL, related_name="+", null=True, blank=True)

    class Meta:
        ordering = ('name',)

    def __str__(self):
        return self.name
    
    def save(self, *args, **kwargs):
        self.name = self.name.capitalize()
        super().save(*args, **kwargs)




class Branch(models.Model):
    name = models.CharField(max_length=50)

    short_desc = models.TextField(blank=True, null=True)
    full_desc = models.TextField(blank=True, null=True)

    organization = models.ForeignKey('Organization', on_delete=models.CASCADE, null=True, blank=True, related_name='branches')

    is_active = models.BooleanField(default=True)

    street_address_one = models.CharField(max_length=255, null=True, blank=True)
    street_address_two = models.CharField(max_length=255, null=True, blank=True)

    thana = models.ForeignKey(Thana, on_delete=models.SET_NULL, null=True, blank=True)
    city = models.ForeignKey(City, on_delete=models.SET_NULL, null=True, blank=True)
    country = models.ForeignKey(Country, on_delete=models.SET_NULL, null=True, blank=True)
    postal_code = models.CharField(max_length=50, null=True, blank=True)

    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    created_by = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete= models.SET_NULL, related_name="+", null=True, blank=True)
    updated_by = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete= models.SET_NULL, related_name="+", null=True, blank=True)

    class Meta:
        ordering = ('name',)
        verbose_name_plural = 'Branches'

    def __str__(self):
        return self.name
    
    def save(self, *args, **kwargs):
        self.name = self.name.capitalize()
        super().save(*args, **kwargs)




class Organization(models.Model):
    class SubscriptionStatus(models.TextChoices):
        TRIALING = 'trialing', _('Trialing')
        ACTIVE = 'active', _('Active')
        PAST_DUE = 'past_due', _('Past Due')
        CANCELED = 'canceled', _('Canceled')

    class Plan(models.TextChoices):
        NONE = 'none', _('None')
        MONTHLY = 'monthly', _('Monthly')
        YEARLY = 'yearly', _('Yearly')

    name = models.CharField(max_length=255)
    owner = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.SET_NULL, null=True, blank=True, related_name='owned_organizations')

    currency = models.CharField(max_length=10, choices=CURRENCY_CHOICES, default='usd')

    # Manager-controlled toggles — Moderators are restricted by default
    # (per the original role spec), but the Manager can grant either of
    # these two abilities on a per-store basis at any time.
    moderator_can_add_employees = models.BooleanField(default=False)
    moderator_can_manage_subscription = models.BooleanField(default=False)
    moderator_can_manage_qr = models.BooleanField(default=False)

    trial_ends_at = models.DateTimeField()
    subscription_status = models.CharField(max_length=20, choices=SubscriptionStatus.choices, default=SubscriptionStatus.TRIALING)
    plan = models.CharField(max_length=20, choices=Plan.choices, default=Plan.NONE)
    # Counted from the day they actually subscribed (or last renewed) —
    # not from the original trial start. Only set once a paid plan is active.
    subscription_expires_at = models.DateTimeField(null=True, blank=True)

    stripe_customer_id = models.CharField(max_length=255, null=True, blank=True)
    stripe_subscription_id = models.CharField(max_length=255, null=True, blank=True)

    # Cut the platform takes on a real-money payout, on top of what the
    # employee receives. Null means "use the platform-wide default" —
    # set by the platform owner in PlatformSettings.
    payout_commission_percent = models.DecimalField(max_digits=5, decimal_places=2, null=True, blank=True)

    # The Manager's saved card for paying employees — set once (either via
    # an explicit "add a payout card" action or automatically the first
    # time they pay through the checkout flow), then reused for every
    # future approval with no further card entry.
    default_payout_payment_method_id = models.CharField(max_length=255, null=True, blank=True)

    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ('name',)

    def __str__(self):
        return self.name

    def save(self, *args, **kwargs):
        if not self.trial_ends_at:
            self.trial_ends_at = timezone.now() + timedelta(days=7)
        super().save(*args, **kwargs)

    def has_active_access(self):
        if self.subscription_status == self.SubscriptionStatus.ACTIVE:
            return True
        if self.subscription_status == self.SubscriptionStatus.TRIALING:
            return timezone.now() <= self.trial_ends_at
        return False

    def has_paid_subscription(self):
        """Stricter than has_active_access() — trialing stores can use the
        rest of the app, but real-money payouts are paid-plan only."""
        return self.subscription_status == self.SubscriptionStatus.ACTIVE

    def effective_commission_percent(self):
        """This store's payout commission if it has its own override,
        otherwise the platform-wide default."""
        if self.payout_commission_percent is not None:
            return self.payout_commission_percent
        from billing.models import PlatformSettings
        return PlatformSettings.current().default_payout_commission_percent

    def expires_at(self):
        """The date that actually matters right now — trial end while
        trialing, otherwise the paid subscription's own expiry (counted
        from when they subscribed/last renewed, not from the trial)."""
        if self.subscription_status == self.SubscriptionStatus.TRIALING:
            return self.trial_ends_at
        return self.subscription_expires_at or self.trial_ends_at




class UserManager(BaseUserManager):
    def create_user(self, first_name, last_name, email, gender, password=None):
        """
        Creates and saves a User with the given email, date of
        birth and password.
        """
        if not email:
            raise ValueError('Users must have an email address')

        user = self.model(
            first_name= first_name,
            last_name = last_name,
            email=self.normalize_email(email),
            gender = gender
        )

        user.set_password(password)
        user.save(using=self._db)
        return user

    def create_superuser(self, first_name, last_name, email, gender, password=None):
        """
        Creates and saves a superuser with the given email, date of
        birth and password.
        """
        user = self.create_user(
            email= email,
            password=password,
            first_name= first_name,
            last_name = last_name,
            gender = gender
        )
        user.is_admin = True
        user.save(using=self._db)
        return user
 



class User(AbstractBaseUser):
    class Gender(models.TextChoices):
        MALE = 'male', _('Male')
        FEMALE = 'female', _('Female')
        OTHERS = 'others', _('Others')

    first_name = models.CharField(max_length=100)
    last_name = models.CharField(max_length=100)
    username = models.CharField(max_length=100, null=True, blank=True, unique=True)
    email = models.EmailField(verbose_name='email address', max_length=255, unique=True)

    gender = models.CharField(max_length=6, choices=Gender.choices, default=Gender.MALE)

    primary_phone = PhoneNumberField(null=True, blank=True, unique=True)
    secondary_phone = PhoneNumberField(null=True, blank=True, unique=True)

    user_type = models.CharField(max_length=255, null=True, blank=True)

    date_of_birth = models.DateField(null=True, blank=True)
    
    is_active = models.BooleanField(default=True)
    is_admin = models.BooleanField(default=False)

    class OrgRole(models.TextChoices):
        MANAGER = 'manager', _('Manager')
        MODERATOR = 'moderator', _('Moderator')
        EMPLOYEE = 'employee', _('Employee')

    # Tenant boundary + in-store role for the multi-tenant SaaS. Distinct from
    # `is_admin` (Django's own is_staff/admin-panel gate) and from the legacy
    # `role` FK below (the old, largely-unused Permission/Role system).
    organization = models.ForeignKey(Organization, on_delete=models.CASCADE, null=True, blank=True, related_name='members')
    org_role = models.CharField(max_length=20, choices=OrgRole.choices, default=OrgRole.EMPLOYEE)

    role = models.ForeignKey(Role, on_delete=models.SET_NULL, null=True, blank=True)

    street_address_one = models.CharField(max_length=255, null=True, blank=True)
    street_address_two = models.CharField(max_length=255, null=True, blank=True)

    thana = models.ForeignKey(Thana, on_delete=models.SET_NULL, null=True, blank=True)
    city = models.ForeignKey(City, on_delete=models.SET_NULL, null=True, blank=True)
    country = models.ForeignKey(Country, on_delete=models.SET_NULL, null=True, blank=True)
    postal_code = models.CharField(max_length=50, null=True, blank=True)

    image = models.ImageField(upload_to="users/", null=True, blank=True)
    nid = models.CharField(max_length=32, null=True, blank=True)

    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    created_by = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete= models.SET_NULL, related_name="+", null=True, blank=True)
    updated_by = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete= models.SET_NULL, related_name="+", null=True, blank=True)
    
    objects = UserManager()

    USERNAME_FIELD = 'email'
    REQUIRED_FIELDS = ['first_name', 'last_name', 'gender']

    class Meta:
        ordering = ('first_name',)

    def __str__(self):
        return self.email

    def save(self, *args, **kwargs):
        super().save(*args, **kwargs)
        if self.image:
            max_width, max_height = 750, 1000
            path = self.image.path
            image = Image.open(path)
            width, height = image.size
            if width > max_width or height > max_height:
                if width > height:
                    w_h = (1000, 750)
                elif height > width:
                    w_h = (750, 1000)
                img = image.resize(w_h)
                img.save(path)  


    def has_perm(self, perm, obj=None):
        "Does the user have a specific permission?"
        # Simplest possible answer: Yes, always
        return True
    
    def get_all_permissions(self, obj=None):
        # This method should return a set of all permissions for the user.
        # You can obtain the permissions using the `Permission` model.
        if not self.is_active:
            return set()

        if not hasattr(self, '_user_perm_cache'):
            user_permissions = Permission.objects.filter(user=self)
            user_permissions = user_permissions.values_list('content_type__app_label', 'codename').order_by()
            self._user_perm_cache = {
                "%s.%s" % (ct, name) for ct, name in user_permissions
            }
        return self._user_perm_cache

    def has_module_perms(self, app_label):
        "Does the user have permissions to view the app `app_label`?"
        # Simplest possible answer: Yes, always
        return True

    @property
    def is_staff(self):
        "Is the user a member of staff?"
        # Simplest possible answer: All admins are staff
        return self.is_admin

    def is_manager(self):
        return self.org_role == self.OrgRole.MANAGER

    def is_moderator(self):
        return self.org_role == self.OrgRole.MODERATOR

    def is_manager_or_moderator(self):
        return self.org_role in (self.OrgRole.MANAGER, self.OrgRole.MODERATOR)

    def is_platform_owner(self):
        return self.is_admin and self.organization_id is None

    def can_add_employees(self):
        if self.is_manager():
            return True
        return self.is_moderator() and bool(self.organization_id) and self.organization.moderator_can_add_employees

    def can_manage_subscription(self):
        if self.is_manager():
            return True
        return self.is_moderator() and bool(self.organization_id) and self.organization.moderator_can_manage_subscription

    def can_manage_qr(self):
        if self.is_manager():
            return True
        return self.is_moderator() and bool(self.organization_id) and self.organization.moderator_can_manage_qr





class Department(models.Model):
    name = models.CharField(max_length=255)

    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    created_by = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete= models.SET_NULL, related_name="+", null=True, blank=True)
    updated_by = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete= models.SET_NULL, related_name="+", null=True, blank=True)

    class Meta:
        ordering = ('name',)

    def __str__(self):
        return self.name
    
    def save(self, *args, **kwargs):
        self.name = self.name.capitalize()
        super().save(*args, **kwargs)




class Employee(User):
    class PayoutCycle(models.TextChoices):
        HOURLY = 'hourly', _('Hourly (instant, right after each shift)')
        WEEKLY = 'weekly', _('Weekly')
        BIWEEKLY = 'biweekly', _('Every 2 weeks')
        MONTHLY = 'monthly', _('Monthly')

    department = models.ForeignKey(Department, on_delete=models.SET_NULL, null=True, blank=True)
    branch = models.ForeignKey(Branch, on_delete=models.SET_NULL, null=True, blank=True)
    emp_id_no = models.CharField(max_length=100, null=True, blank=True)
    emp_join_date = models.DateField(null=True, blank=True)
    basic_money = models.IntegerField(null=True, blank=True)
    allowance_money = models.IntegerField(null=True, blank=True)
    hourly_rate = models.DecimalField(max_digits=10, decimal_places=2, null=True, blank=True)
    # Set by whoever set hourly_rate (Manager, or a permitted Moderator) —
    # not necessarily the store's own currency, since this employee could
    # be paid in a different one. Defaults to the store's currency at the
    # time the rate is first set.
    currency = models.CharField(max_length=10, choices=CURRENCY_CHOICES, default='usd')
    payout_cycle = models.CharField(max_length=20, choices=PayoutCycle.choices, default=PayoutCycle.WEEKLY)
    stripe_connect_account_id = models.CharField(max_length=255, null=True, blank=True)

    designation = models.ForeignKey(Designation, on_delete=models.SET_NULL, null=True, blank=True)
    father_name = models.CharField(max_length=255, null=True, blank=True)
    mother_name = models.CharField(max_length=255, null=True, blank=True)
    marital_status = models.CharField(max_length=255, null=True, blank=True)
    spouse_name = models.CharField(max_length=255, null=True, blank=True)
    marriage_date = models.DateField(null=True, blank=True)

    def save(self, *args, **kwargs):
        super().save(*args, **kwargs)
        if self.image:
            max_width, max_height = 750, 1000
            path = self.image.path
            image = Image.open(path)
            width, height = image.size
            if width > max_width or height > max_height:
                if width > height:
                    w_h = (1000, 750)
                elif height > width:
                    w_h = (750, 1000)
                img = image.resize(w_h)
                img.save(path) 




class Vendor(User):
    branch = models.ForeignKey(Branch, on_delete=models.SET_NULL, null=True, blank=True)
    is_online = models.BooleanField(default=True)
    customer_credit_limit = models.DecimalField(max_digits=20, decimal_places=2, null=True, blank=True)

    is_company = models.BooleanField(default=False)
    company_name = models.CharField(max_length=200, null=True, blank=True)
    contact_person = models.CharField(max_length=30, null=True, blank=True)

    def save(self, *args, **kwargs):
        super().save(*args, **kwargs)
        if self.image:
            max_width, max_height = 750, 1000
            path = self.image.path
            image = Image.open(path)
            width, height = image.size
            if width > max_width or height > max_height:
                if width > height:
                    w_h = (1000, 750)
                elif height > width:
                    w_h = (750, 1000)
                img = image.resize(w_h)
                img.save(path) 




class CustomerType(models.Model):
    name = models.CharField(max_length=20)

    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    created_by = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete= models.SET_NULL, related_name="+", null=True, blank=True)
    updated_by = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete= models.SET_NULL, related_name="+", null=True, blank=True)

    class Meta:
        verbose_name_plural = 'CustomerTypes'

    def __str__(self):
        return self.name
    
    def save(self, *args, **kwargs):
        self.name = self.name.capitalize()
        super().save(*args, **kwargs)



class Customer(User):
    branch = models.ForeignKey(Branch, on_delete=models.SET_NULL, null=True, blank=True)
    is_online = models.BooleanField(default=True)
    cusotmer_type = models.ForeignKey(CustomerType, on_delete=models.SET_NULL, null=True, blank=True)
    customer_credit_limit = models.DecimalField(max_digits=20, decimal_places=2, null=True, blank=True)

    def save(self, *args, **kwargs):
        super().save(*args, **kwargs)
        if self.image:
            max_width, max_height = 750, 1000
            path = self.image.path
            image = Image.open(path)
            width, height = image.size
            if width > max_width or height > max_height:
                if width > height:
                    w_h = (1000, 750)
                elif height > width:
                    w_h = (750, 1000)
                img = image.resize(w_h)
                img.save(path) 




class Qualification(models.Model):
    employee_id = models.ForeignKey(Employee, on_delete=models.CASCADE)
    degree_name = models.CharField(max_length=64)
    passign_year = models.CharField(max_length=4)
    board = models.CharField(max_length=64)
    institute_name = models.CharField(max_length=100)
    grade = models.DecimalField(max_digits=5, decimal_places=2, null=True, blank=True)

    image_doc_one = models.ImageField(upload_to="qulification/", null=True, blank=True)
    image_doc_two = models.ImageField(upload_to="qulification/", null=True, blank=True)
    image_doc_three = models.ImageField(upload_to="qulification/", null=True, blank=True)
    image_doc_four = models.ImageField(upload_to="qulification/", null=True, blank=True)

    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    created_by = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete= models.SET_NULL, related_name="+", null=True, blank=True)
    updated_by = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete= models.SET_NULL, related_name="+", null=True, blank=True)

    class Meta:
        ordering = ('-id',)

    def __str__(self):
        return self.degree_name
    
    def save(self, *args, **kwargs):
        self.degree_name = self.degree_name.capitalize()
        super().save(*args, **kwargs)
        img_list = []
        if self.image_doc_one:
            img_list.append(self.image_doc_one)
        if self.image_doc_two:
            img_list.append(self.image_doc_two)
        if self.image_doc_three:
            img_list.append(self.image_doc_three)
        if self.image_doc_four:
            img_list.append(self.image_doc_four)
        for imge in img_list:
            max_width, max_height = 750, 1000
            path = imge.path
            image = Image.open(path)
            width, height = image.size
            if width > max_width or height > max_height:
                if width > height:
                    w_h = (1000, 750)
                elif height > width:
                    w_h = (750, 1000)
                img = image.resize(w_h)
                img.save(path)  




class LoginHistory(models.Model):
    user = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.RESTRICT)

    ip_address = models.CharField(max_length=255, null=True, blank=True)
    mac_address = models.CharField(max_length=255, null=True, blank=True)
    g_location_info = models.CharField(max_length=500, null=True, blank=True)
    is_device_blocked = models.BooleanField(default=False)

    login_time = models.DateTimeField(null=True, blank=True)
    logout_time = models.DateTimeField(null=True, blank=True)

    status = models.CharField(max_length=255, null=True, blank=True)

    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    created_by = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete= models.SET_NULL, related_name="+", null=True, blank=True)
    updated_by = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete= models.SET_NULL, related_name="+", null=True, blank=True)

    class Meta:
        verbose_name_plural = 'LoginHistories'
        ordering = ('-id',)

    def __str__(self):
        return self.user.username if self.user else self.user