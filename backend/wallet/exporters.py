import csv
from io import BytesIO, StringIO

from reportlab.lib import colors
from reportlab.lib.pagesizes import A4, landscape
from reportlab.lib.styles import getSampleStyleSheet
from reportlab.platypus import SimpleDocTemplate, Table, TableStyle, Paragraph, Spacer

from openpyxl import Workbook
from openpyxl.styles import Font

HEADERS = ["Employee", "Email", "Hours worked", "Hourly rate", "Currency", "Payout cycle", "Gross pay"]


def _row_values(row):
    return [
        row["name"],
        row["email"],
        row["hours_worked"],
        row["hourly_rate"],
        row["currency"],
        row["payout_cycle"],
        row["gross_pay"],
    ]


def render_csv(rows):
    """UTF-8 with a BOM — the encoding accounting tools (Excel, Xero, MYOB)
    expect when importing a CSV so currency symbols/special characters don't
    come out garbled."""
    buffer = StringIO()
    writer = csv.writer(buffer)
    writer.writerow(HEADERS)
    for row in rows:
        writer.writerow(_row_values(row))
    return buffer.getvalue().encode("utf-8-sig")


def render_pdf(rows, date_from, date_to):
    buffer = BytesIO()
    doc = SimpleDocTemplate(buffer, pagesize=landscape(A4))
    styles = getSampleStyleSheet()

    elements = [
        Paragraph(f"Payroll report &middot; {date_from} to {date_to}", styles["Title"]),
        Spacer(1, 12),
    ]

    data = [HEADERS] + [_row_values(r) for r in rows]
    table = Table(data, repeatRows=1)
    table.setStyle(
        TableStyle(
            [
                ("BACKGROUND", (0, 0), (-1, 0), colors.HexColor("#16233A")),
                ("TEXTCOLOR", (0, 0), (-1, 0), colors.white),
                ("FONTNAME", (0, 0), (-1, 0), "Helvetica-Bold"),
                ("GRID", (0, 0), (-1, -1), 0.5, colors.HexColor("#E1E3DC")),
                ("ROWBACKGROUNDS", (0, 1), (-1, -1), [colors.white, colors.HexColor("#F5F6F2")]),
                ("FONTSIZE", (0, 0), (-1, -1), 9),
                ("TOPPADDING", (0, 0), (-1, -1), 6),
                ("BOTTOMPADDING", (0, 0), (-1, -1), 6),
            ]
        )
    )
    elements.append(table)
    doc.build(elements)

    return buffer.getvalue()


PAYSLIP_HEADERS = ["Date", "Type", "Description", "Hours", "Amount", "Status"]


def _payslip_row_values(line, currency):
    return [
        line['date'].isoformat(),
        line['type'],
        line['description'],
        f"{line['hours']:.2f}" if line['hours'] else "—",
        f"{currency} {line['amount']:.2f}",
        line['status'],
    ]


def render_payslip_pdf(payslip, date_from, date_to, organization_name):
    """A single employee's own payslip — line items plus a summary — as
    opposed to render_pdf above, which is a per-org table across everyone
    for a manager's accounting export."""
    employee = payslip['employee']
    currency = employee.currency or ''

    buffer = BytesIO()
    doc = SimpleDocTemplate(buffer, pagesize=A4, topMargin=36, bottomMargin=36)
    styles = getSampleStyleSheet()

    elements = [
        Paragraph(organization_name, styles["Title"]),
        Paragraph(f"Payslip &middot; {date_from} to {date_to}", styles["Heading2"]),
        Spacer(1, 6),
        Paragraph(f"{employee.first_name} {employee.last_name} &middot; {employee.email}", styles["Normal"]),
        Spacer(1, 16),
    ]

    if payslip['lines']:
        data = [PAYSLIP_HEADERS] + [_payslip_row_values(l, currency) for l in payslip['lines']]
        table = Table(data, repeatRows=1)
        table.setStyle(
            TableStyle(
                [
                    ("BACKGROUND", (0, 0), (-1, 0), colors.HexColor("#16233A")),
                    ("TEXTCOLOR", (0, 0), (-1, 0), colors.white),
                    ("FONTNAME", (0, 0), (-1, 0), "Helvetica-Bold"),
                    ("GRID", (0, 0), (-1, -1), 0.5, colors.HexColor("#E1E3DC")),
                    ("ROWBACKGROUNDS", (0, 1), (-1, -1), [colors.white, colors.HexColor("#F5F6F2")]),
                    ("FONTSIZE", (0, 0), (-1, -1), 9),
                    ("TOPPADDING", (0, 0), (-1, -1), 6),
                    ("BOTTOMPADDING", (0, 0), (-1, -1), 6),
                ]
            )
        )
        elements.append(table)
    else:
        elements.append(Paragraph("No wallet activity in this period.", styles["Normal"]))

    elements.append(Spacer(1, 20))
    summary_data = [
        ["Total earned", f"{currency} {payslip['total_earned']:.2f}"],
        ["Total paid out", f"{currency} {payslip['total_paid_out']:.2f}"],
        ["Net for this period", f"{currency} {payslip['balance']:.2f}"],
        ["Hours worked", f"{payslip['total_hours']:.2f}"],
    ]
    summary_table = Table(summary_data, colWidths=[160, 160])
    summary_table.setStyle(
        TableStyle(
            [
                ("FONTNAME", (0, 0), (0, -1), "Helvetica"),
                ("FONTNAME", (1, 0), (1, -1), "Helvetica-Bold"),
                ("FONTNAME", (0, 2), (1, 2), "Helvetica-Bold"),
                ("LINEABOVE", (0, 2), (1, 2), 0.75, colors.HexColor("#16233A")),
                ("FONTSIZE", (0, 0), (-1, -1), 10),
                ("BOTTOMPADDING", (0, 0), (-1, -1), 4),
            ]
        )
    )
    elements.append(summary_table)

    doc.build(elements)
    return buffer.getvalue()


def render_excel(rows, date_from, date_to):
    wb = Workbook()
    ws = wb.active
    ws.title = "Payroll report"

    ws.append(["Payroll report", f"{date_from} to {date_to}"])
    ws.append([])
    ws.append(HEADERS)
    for cell in ws[3]:
        cell.font = Font(bold=True)

    for row in rows:
        ws.append(_row_values(row))

    for col_cells in ws.columns:
        length = max((len(str(c.value)) for c in col_cells if c.value is not None), default=10)
        ws.column_dimensions[col_cells[0].column_letter].width = min(40, length + 2)

    buffer = BytesIO()
    wb.save(buffer)
    return buffer.getvalue()
