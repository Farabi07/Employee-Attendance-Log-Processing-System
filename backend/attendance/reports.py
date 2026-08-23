from attendance.models import Attendance, LeaveRequest


def build_report_rows(date_from, date_to, organization):
    """Per-employee attendance summary for [date_from, date_to] inclusive,
    scoped to one organization. Mirrors the aggregation the frontend does
    client-side for the CSV export, so CSV/PDF/Excel all agree."""
    attendances = Attendance.objects.filter(
        date__gte=date_from, date__lte=date_to, employee__organization=organization
    ).select_related('employee')
    leave_requests = LeaveRequest.objects.filter(
        status=LeaveRequest.Status.APPROVED,
        start_date__lte=date_to,
        end_date__gte=date_from,
        employee__organization=organization,
    ).select_related('employee')

    rows = {}

    def bucket(employee):
        if employee.id not in rows:
            rows[employee.id] = {
                'employee_id': employee.id,
                'name': f"{employee.first_name} {employee.last_name}",
                'email': employee.email,
                'days_present': 0,
                'hours_worked': 0.0,
                'leave_days': 0,
            }
        return rows[employee.id]

    for a in attendances:
        row = bucket(a.employee)
        if a.check_in_time:
            row['days_present'] += 1
        if a.worked_hours:
            row['hours_worked'] += float(a.worked_hours)

    for lr in leave_requests:
        row = bucket(lr.employee)
        start = max(lr.start_date, date_from)
        end = min(lr.end_date, date_to)
        if start <= end:
            row['leave_days'] += (end - start).days + 1

    return sorted(rows.values(), key=lambda r: r['name'])
