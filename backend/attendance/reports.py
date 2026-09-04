from attendance.models import Attendance, LeaveRequest, Roster


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


def build_timesheet_rows(date_from, date_to, organization, employee_id=None):
    """Day-by-day detail for [date_from, date_to] inclusive — the actual
    clock-in/out log a Timesheet needs, as opposed to build_report_rows'
    per-employee totals. One row per Attendance record, with that day's
    scheduled shift (if any) alongside the actual times."""
    attendances = Attendance.objects.filter(
        date__gte=date_from, date__lte=date_to, employee__organization=organization
    ).select_related('employee')
    if employee_id:
        attendances = attendances.filter(employee_id=employee_id)

    rosters = Roster.objects.filter(
        date__gte=date_from, date__lte=date_to, employee__organization=organization
    ).select_related('shift')
    if employee_id:
        rosters = rosters.filter(employee_id=employee_id)
    scheduled_by_key = {(r.employee_id, r.date): r.shift for r in rosters}

    rows = []
    for a in attendances:
        shift = scheduled_by_key.get((a.employee_id, a.date))
        rows.append(
            {
                'employee_id': a.employee_id,
                'name': f"{a.employee.first_name} {a.employee.last_name}",
                'date': a.date,
                'scheduled_shift': shift.name if shift else None,
                'check_in': a.check_in_time,
                'check_out': a.check_out_time,
                'worked_hours': float(a.worked_hours) if a.worked_hours else 0.0,
                'overtime_hours': float(a.overtime_hours or 0),
                'shortfall_hours': float(a.shortfall_hours or 0),
                'status': a.status,
            }
        )
    return sorted(rows, key=lambda r: (r['name'], r['date']))
