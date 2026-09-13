import datetime

from django.core.management.base import BaseCommand
from django.utils import timezone

from attendance.models import Roster, Attendance
from attendance.notify import notify_shift_reminder


class Command(BaseCommand):
    help = (
        "Sends a push notification to anyone whose shift starts soon and who "
        "hasn't checked in yet. Unlike mark_absent/run_scheduled_payouts (once "
        "a day is fine), this needs to run frequently — every 10-15 minutes — "
        "or shifts either never land inside the reminder window or the "
        "reminder arrives too late to be useful. Example cron line (every 10 "
        "minutes):\n"
        "  */10 * * * * cd /path/to/backend && env/bin/python manage.py send_shift_reminders"
    )

    def add_arguments(self, parser):
        parser.add_argument(
            '--minutes-before', type=int, default=30,
            help="How many minutes before shift start to aim the reminder at. Default 30.",
        )
        parser.add_argument(
            '--window', type=int, default=15,
            help=(
                "+/- minutes around --minutes-before that counts as 'due now' — should be at "
                "least as wide as how often this command actually runs, so no shift falls "
                "between two runs and gets missed entirely. Default 15."
            ),
        )

    def handle(self, *args, **options):
        now = timezone.localtime()
        today = now.date()
        minutes_before = options['minutes_before']
        window = options['window']

        target = now + datetime.timedelta(minutes=minutes_before)
        window_start = target - datetime.timedelta(minutes=window)
        window_end = target + datetime.timedelta(minutes=window)

        candidates = Roster.objects.filter(
            date=today,
            shift__isnull=False,
            reminder_sent_at__isnull=True,
        ).select_related('shift', 'employee')

        sent = 0
        for roster in candidates:
            shift_start = datetime.datetime.combine(today, roster.shift.start_time)
            if timezone.is_naive(shift_start) and not timezone.is_naive(now):
                shift_start = timezone.make_aware(shift_start)

            if not (window_start <= shift_start <= window_end):
                continue

            already_checked_in = Attendance.objects.filter(
                employee=roster.employee, date=today, check_in_time__isnull=False
            ).exists()

            # Either way this roster row is "handled" for reminder purposes —
            # someone already checked in needs no nudge, and someone who
            # hasn't gets one exactly once.
            if not already_checked_in:
                notify_shift_reminder(roster)
                sent += 1
            roster.reminder_sent_at = now
            roster.save(update_fields=['reminder_sent_at'])

        self.stdout.write(self.style.SUCCESS(f"Sent {sent} shift reminder(s) for {today}."))
