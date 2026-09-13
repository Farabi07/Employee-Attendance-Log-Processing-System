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


def build_employee_payslip(date_from, date_to, employee):
    """Line-item earnings/payouts for one employee over [date_from, date_to]
    inclusive — the employee-facing counterpart to build_payroll_report_rows
    above (which is a per-org summary for managers). Every transaction in
    the range is listed (not just completed ones) so a pending or failed
    payout is visible on the slip rather than silently missing, but only
    completed rows count toward the summary totals."""
    transactions = WalletTransaction.objects.filter(
        employee=employee,
        created_at__date__gte=date_from,
        created_at__date__lte=date_to,
    ).select_related('related_attendance').order_by('created_at')

    lines = []
    total_earned = Decimal('0')
    total_paid_out = Decimal('0')
    total_hours = 0.0

    for txn in transactions:
        hours = None
        if txn.related_attendance and txn.related_attendance.worked_hours:
            hours = float(txn.related_attendance.worked_hours)

        if txn.type == WalletTransaction.Type.EARNING:
            description = f"Worked {hours:.2f}h" if hours else "Earning"
        else:
            description = txn.note or f"Payout ({txn.get_payout_method_display()})" if txn.payout_method else (txn.note or "Payout")

        lines.append(
            {
                'date': txn.created_at.date(),
                'type': txn.get_type_display(),
                'description': description,
                'hours': round(hours, 2) if hours else None,
                'amount': txn.amount,
                'status': txn.get_status_display(),
            }
        )

        if txn.status == WalletTransaction.Status.COMPLETED:
            if txn.type == WalletTransaction.Type.EARNING:
                total_earned += txn.amount
                if hours:
                    total_hours += hours
            else:
                total_paid_out += txn.amount

    return {
        'employee': employee,
        'lines': lines,
        'total_earned': total_earned,
        'total_paid_out': total_paid_out,
        'balance': total_earned - total_paid_out,
        'total_hours': round(total_hours, 2),
    }
