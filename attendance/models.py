import secrets

from django.conf import settings
from django.db import models
from django.utils import timezone

from authentication.models import Branch, Employee




class Shift(models.Model):
    name = models.CharField(max_length=100)
    start_time = models.TimeField()
    end_time = models.TimeField()

    branch = models.ForeignKey(Branch, on_delete=models.SET_NULL, null=True, blank=True)
    grace_minutes = models.PositiveIntegerField(default=15)

    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    created_by = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete= models.SET_NULL, related_name="+", null=True, blank=True)
    updated_by = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete= models.SET_NULL, related_name="+", null=True, blank=True)

    class Meta:
        ordering = ('name',)

    def __str__(self):
        return self.name




class Roster(models.Model):
    employee = models.ForeignKey(Employee, on_delete=models.CASCADE, related_name='rosters')
    shift = models.ForeignKey(Shift, on_delete=models.SET_NULL, null=True, blank=True, related_name='rosters')

    date = models.DateField()
    note = models.CharField(max_length=255, null=True, blank=True)

    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    created_by = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete= models.SET_NULL, related_name="+", null=True, blank=True)
    updated_by = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete= models.SET_NULL, related_name="+", null=True, blank=True)

    class Meta:
        ordering = ('-date',)
        unique_together = ('employee', 'date')

    def __str__(self):
        return f"{self.employee} - {self.date}"




class AttendanceQRToken(models.Model):
    branch = models.OneToOneField(Branch, on_delete=models.CASCADE, related_name='attendance_qr_token')
    token = models.CharField(max_length=64, unique=True, editable=False)
    is_active = models.BooleanField(default=True)

    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    created_by = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete= models.SET_NULL, related_name="+", null=True, blank=True)
    updated_by = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete= models.SET_NULL, related_name="+", null=True, blank=True)

    class Meta:
        ordering = ('-id',)

    def __str__(self):
        return f"QR - {self.branch}"

    def save(self, *args, **kwargs):
        if not self.token:
            self.token = secrets.token_urlsafe(32)
        super().save(*args, **kwargs)

    def regenerate(self):
        self.token = secrets.token_urlsafe(32)
        self.save()




class Attendance(models.Model):
    class Status(models.TextChoices):
        PRESENT = 'present', 'Present'
        LATE = 'late', 'Late'
        ABSENT = 'absent', 'Absent'
        HALF_DAY = 'half_day', 'Half Day'
        ON_LEAVE = 'on_leave', 'On Leave'

    employee = models.ForeignKey(Employee, on_delete=models.CASCADE, related_name='attendances')
    branch = models.ForeignKey(Branch, on_delete=models.SET_NULL, null=True, blank=True)

    date = models.DateField(default=timezone.localdate)
    check_in_time = models.DateTimeField(null=True, blank=True)
    check_out_time = models.DateTimeField(null=True, blank=True)
    worked_hours = models.DecimalField(max_digits=5, decimal_places=2, null=True, blank=True)

    status = models.CharField(max_length=20, choices=Status.choices, default=Status.PRESENT)

    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    created_by = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete= models.SET_NULL, related_name="+", null=True, blank=True)
    updated_by = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete= models.SET_NULL, related_name="+", null=True, blank=True)

    class Meta:
        ordering = ('-date',)
        unique_together = ('employee', 'date')
        verbose_name_plural = 'Attendances'

    def __str__(self):
        return f"{self.employee} - {self.date}"




class LeaveType(models.Model):
    name = models.CharField(max_length=100)

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




class LeaveRequest(models.Model):
    class Status(models.TextChoices):
        PENDING = 'pending', 'Pending'
        APPROVED = 'approved', 'Approved'
        REJECTED = 'rejected', 'Rejected'

    employee = models.ForeignKey(Employee, on_delete=models.CASCADE, related_name='leave_requests')
    leave_type = models.ForeignKey(LeaveType, on_delete=models.SET_NULL, null=True, blank=True)

    start_date = models.DateField()
    end_date = models.DateField()
    reason = models.TextField(null=True, blank=True)

    status = models.CharField(max_length=20, choices=Status.choices, default=Status.PENDING)

    reviewed_by = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.SET_NULL, related_name="+", null=True, blank=True)
    reviewed_at = models.DateTimeField(null=True, blank=True)
    review_note = models.TextField(null=True, blank=True)

    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    created_by = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete= models.SET_NULL, related_name="+", null=True, blank=True)
    updated_by = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete= models.SET_NULL, related_name="+", null=True, blank=True)

    class Meta:
        ordering = ('-created_at',)

    def __str__(self):
        return f"{self.employee} - {self.start_date} to {self.end_date}"
