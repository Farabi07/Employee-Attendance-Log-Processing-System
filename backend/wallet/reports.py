from decimal import Decimal

from django.db.models import Sum

from authentication.models import Employee
from wallet.models import WalletTransaction


def build_payroll_report_rows(date_from, date_to, organization):
    """Per-employee payroll summary for [date_from, date_to] inclusive,
    scoped to one organization. Only completed earnings count as gross pay,
    matching what actually left the wallet — not what's still pending.
    Used by CSV/PDF/Excel export so all three agree."""
    employees = Employee.objects.filter(organization=organization).order_by('first_name', 'last_name')

    earnings = WalletTransaction.objects.filter(
        organization=organization,
        type=WalletTransaction.Type.EARNING,
        status=WalletTransaction.Status.COMPLETED,
        created_at__date__gte=date_from,
        created_at__date__lte=date_to,
    ).select_related('related_attendance')

    gross_pay_by_employee = {}
    hours_by_employee = {}
    for txn in earnings:
        gross_pay_by_employee[txn.employee_id] = gross_pay_by_employee.get(txn.employee_id, Decimal('0')) + txn.amount
        if txn.related_attendance and txn.related_attendance.worked_hours:
            hours_by_employee[txn.employee_id] = hours_by_employee.get(txn.employee_id, 0.0) + float(txn.related_attendance.worked_hours)

    rows = []
    for employee in employees:
        gross_pay = gross_pay_by_employee.get(employee.id)
        if not gross_pay:
            continue
        rows.append(
            {
                'name': f"{employee.first_name} {employee.last_name}",
                'email': employee.email,
                'hours_worked': round(hours_by_employee.get(employee.id, 0.0), 2),
                'hourly_rate': employee.hourly_rate,
                'currency': employee.currency,
                'payout_cycle': employee.payout_cycle,
                'gross_pay': gross_pay,
            }
        )
    return rows
