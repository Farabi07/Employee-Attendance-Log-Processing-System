import datetime

from django.core.management.base import BaseCommand
from django.utils import timezone

from attendance.absentee import mark_absent_for_date


class Command(BaseCommand):
    help = (
        "Marks employees absent for a given date if they were rostered but never checked in. "
        "Intended to be run once a day (e.g. via cron) for the previous day, after the shift has ended:\n"
        "  0 23 * * * cd /path/to/backend && env/bin/python manage.py mark_absent"
    )

    def add_arguments(self, parser):
        parser.add_argument(
            '--date',
            type=str,
            default=None,
            help="Date to process, YYYY-MM-DD. Defaults to yesterday.",
        )

    def handle(self, *args, **options):
        if options['date']:
            target_date = datetime.date.fromisoformat(options['date'])
        else:
            target_date = timezone.localdate() - datetime.timedelta(days=1)

        marked = mark_absent_for_date(target_date)
        self.stdout.write(self.style.SUCCESS(f"Marked {len(marked)} employee(s) absent for {target_date}."))
