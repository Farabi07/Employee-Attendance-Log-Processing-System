from attendance.models import Roster, Attendance, LeaveRequest


def mark_absent_for_date(target_date, organization=None):
    """For every Roster entry on target_date with no Attendance row yet,
    create one as 'absent' (or 'on_leave' if an approved leave covers the date).
    Returns the list of employee ids marked. Scoped to `organization` when given."""
    rosters = Roster.objects.filter(date=target_date).select_related('employee', 'shift', 'shift__branch')
    if organization is not None:
        rosters = rosters.filter(employee__organization=organization)
    marked = []

    for roster in rosters:
        if Attendance.objects.filter(employee=roster.employee, date=target_date).exists():
            continue

        on_leave = LeaveRequest.objects.filter(
            employee=roster.employee,
            status=LeaveRequest.Status.APPROVED,
            start_date__lte=target_date,
            end_date__gte=target_date,
        ).exists()

        Attendance.objects.create(
            employee=roster.employee,
            branch=roster.shift.branch if roster.shift else None,
            date=target_date,
            status=Attendance.Status.ON_LEAVE if on_leave else Attendance.Status.ABSENT,
        )
        marked.append(roster.employee_id)

    return marked
