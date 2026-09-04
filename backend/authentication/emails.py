from django.conf import settings
from django.core.mail import send_mail


def send_employee_credentials_email(employee, password):
	"""Fired right after a Manager/Moderator creates a new employee — the
	only place the plaintext temporary password is ever available, since
	it's hashed immediately after. Best-effort (fail_silently): a broken or
	unconfigured mail server should never block account creation itself —
	the manager can always relay the password another way if this fails."""
	login_url = getattr(settings, 'BILLING_RETURN_URL', None) or 'http://127.0.0.1:5173'
	org_name = employee.organization.name if employee.organization_id else 'TimeTap'

	subject = f"Your {org_name} account is ready"
	message = (
		f"Hi {employee.first_name},\n\n"
		f"An account has been created for you on {org_name}'s TimeTap.\n\n"
		f"Email: {employee.email}\n"
		f"Temporary password: {password}\n\n"
		f"Sign in here: {login_url}\n\n"
		f"For security, please change your password and add a profile photo after you log in."
	)

	send_mail(
		subject=subject,
		message=message,
		from_email=settings.DEFAULT_FROM_EMAIL,
		recipient_list=[employee.email],
		fail_silently=True,
	)
