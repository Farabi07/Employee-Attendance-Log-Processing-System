from rest_framework.test import APITestCase
from rest_framework import status

from django_currentuser.middleware import _set_current_user

from authentication.models import Organization, Employee, Role
from wallet.models import WalletTransaction


def make_org(name):
	return Organization.objects.create(name=name, trial_ends_at=None)


def make_manager(org, email):
	u = Employee.objects.create(
		first_name="M", last_name="Manager", email=email, gender="male",
		organization=org, role=Role.objects.get(name='MANAGER'),
	)
	u.set_password("Test@1234")
	u.save()
	return u


def make_employee(org, email):
	u = Employee.objects.create(
		first_name="E", last_name="Employee", email=email, gender="male",
		organization=org, role=Role.objects.get(name='EMPLOYEE'),
	)
	u.set_password("Test@1234")
	u.save()
	return u


class ManagerInitiatedCashPayoutTests(APITestCase):
	def setUp(self):
		_set_current_user(None)
		self.org = make_org("Cash Payout Org")
		self.org.subscription_status = Organization.SubscriptionStatus.ACTIVE
		self.org.save()
		self.manager = make_manager(self.org, "cash.mgr@example.com")
		self.employee = make_employee(self.org, "cash.emp@example.com")
		WalletTransaction.objects.create(
			employee=self.employee, organization=self.org,
			type=WalletTransaction.Type.EARNING, status=WalletTransaction.Status.COMPLETED,
			amount=200,
		)

	def test_manager_can_pay_employee_cash_without_a_prior_request(self):
		self.client.force_authenticate(user=self.manager)
		resp = self.client.post(f'/wallet/api/v1/payout/pay_cash/{self.employee.id}/', {'amount': '150'}, format='json')
		self.assertEqual(resp.status_code, status.HTTP_201_CREATED)
		self.assertEqual(resp.data['status'], 'awaiting_confirmation')
		self.assertEqual(resp.data['payout_method'], 'cash')

		transaction_id = resp.data['id']

		self.client.force_authenticate(user=self.employee)
		resp = self.client.post(f'/wallet/api/v1/payout/{transaction_id}/confirm_cash/')
		self.assertEqual(resp.status_code, status.HTTP_200_OK)
		self.assertEqual(resp.data['status'], 'completed')

	def test_cannot_pay_more_than_current_balance(self):
		self.client.force_authenticate(user=self.manager)
		resp = self.client.post(f'/wallet/api/v1/payout/pay_cash/{self.employee.id}/', {'amount': '500'}, format='json')
		self.assertEqual(resp.status_code, status.HTTP_400_BAD_REQUEST)

	def test_defaults_to_full_balance_when_amount_omitted(self):
		self.client.force_authenticate(user=self.manager)
		resp = self.client.post(f'/wallet/api/v1/payout/pay_cash/{self.employee.id}/', {}, format='json')
		self.assertEqual(resp.status_code, status.HTTP_201_CREATED)
		self.assertEqual(str(resp.data['amount']), '200.00')

	def test_employee_cannot_pay_themselves_cash(self):
		self.client.force_authenticate(user=self.employee)
		resp = self.client.post(f'/wallet/api/v1/payout/pay_cash/{self.employee.id}/', {'amount': '50'}, format='json')
		self.assertEqual(resp.status_code, status.HTTP_403_FORBIDDEN)
