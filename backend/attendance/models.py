import secrets
import time

import pyotp

from django.conf import settings
from django.db import models
from django.utils import timezone

from authentication.models import Branch, Employee, Organization

QR_CODE_PERIOD_SECONDS = 30




class Shift(models.Model):
    name = models.CharField(max_length=100)
    start_time = models.TimeField()
    end_time = models.TimeField()

    organization = models.ForeignKey(Organization, on_delete=models.CASCADE, null=True, blank=True, related_name='shifts')
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
    """One per branch. `token` holds a TOTP seed secret (never shown to
    anyone) — the QR actually displayed/scanned encodes a 6-digit code
    derived from that secret plus the current 30-second time window
    (the same scheme Google Authenticator uses, RFC 6238), so a
    screenshot or photo of the screen is useless 30 seconds later."""

    branch = models.OneToOneField(Branch, on_delete=models.CASCADE, related_name='attendance_qr_token')
    token = models.CharField(max_length=64, unique=True, editable=False)
    is_active = models.BooleanField(default=True)

    latitude = models.DecimalField(max_digits=9, decimal_places=6, null=True, blank=True)
    longitude = models.DecimalField(max_digits=9, decimal_places=6, null=True, blank=True)
    allowed_radius_meters = models.PositiveIntegerField(null=True, blank=True)

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
            self.token = pyotp.random_base32()
        super().save(*args, **kwargs)

    def regenerate(self):
        self.token = pyotp.random_base32()
        self.save()

    @property
    def _totp(self):
        return pyotp.TOTP(self.token, interval=QR_CODE_PERIOD_SECONDS, digits=6)

    def current_code(self):
        return self._totp.now()

    def seconds_remaining(self):
        return QR_CODE_PERIOD_SECONDS - int(time.time()) % QR_CODE_PERIOD_SECONDS

    def verify_code(self, code):
        if not code:
            return False
        # valid_window=1 tolerates the scan/network round-trip landing just
        # after a window rolled over, without extending the effective life
        # of a leaked code by more than one extra period.
        return self._totp.verify(str(code), valid_window=1)

    @property
    def geofence_enabled(self):
        return self.latitude is not None and self.longitude is not None and self.allowed_radius_meters is not None




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
    earnings = models.DecimalField(max_digits=10, decimal_places=2, null=True, blank=True)

    check_in_lat = models.DecimalField(max_digits=9, decimal_places=6, null=True, blank=True)
    check_in_lon = models.DecimalField(max_digits=9, decimal_places=6, null=True, blank=True)
    check_out_lat = models.DecimalField(max_digits=9, decimal_places=6, null=True, blank=True)
    check_out_lon = models.DecimalField(max_digits=9, decimal_places=6, null=True, blank=True)

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
    organization = models.ForeignKey(Organization, on_delete=models.CASCADE, null=True, blank=True, related_name='leave_types')

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




class Notification(models.Model):
    class NotificationType(models.TextChoices):
        ROSTER_ASSIGNED = 'roster_assigned', 'Roster assigned'
        LEAVE_SUBMITTED = 'leave_submitted', 'Leave submitted'
        LEAVE_REVIEWED = 'leave_reviewed', 'Leave reviewed'
        RATE_CHANGED = 'rate_changed', 'Pay rate changed'
        GENERAL = 'general', 'General'

    recipient = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name='notifications')

    notification_type = models.CharField(max_length=30, choices=NotificationType.choices, default=NotificationType.GENERAL)
    title = models.CharField(max_length=255)
    message = models.TextField(blank=True, null=True)
    is_read = models.BooleanField(default=False)

    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ('-created_at',)

    def __str__(self):
        return f"{self.recipient} - {self.title}"
