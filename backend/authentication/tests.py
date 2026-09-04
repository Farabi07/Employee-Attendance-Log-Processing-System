from django.core import mail
from rest_framework.test import APITestCase
from rest_framework import status

from django_currentuser.middleware import _set_current_user

from authentication.models import Organization, Employee, Role


def make_org(name):
	return Organization.objects.create(name=name, trial_ends_at=None)


class EmployeeCreationEmailTests(APITestCase):
	def setUp(self):
		_set_current_user(None)
		self.org = make_org("Email Org")
		self.manager = Employee.objects.create(
			first_name="Mgr", last_name="Boss", email="email.mgr@example.com", gender="male",
			organization=self.org, role=Role.objects.get(name='MANAGER'),
		)
		self.manager.set_password("Test@1234")
		self.manager.save()

	def test_creating_employee_sends_credentials_email(self):
		self.client.force_authenticate(user=self.manager)
		resp = self.client.post(
			'/employee/api/v1/employee/create/',
			{'first_name': 'New', 'last_name': 'Hire', 'email': 'new.hire@example.com', 'password': 'Temp@1234', 'gender': 'male'},
			format='json',
		)
		self.assertEqual(resp.status_code, status.HTTP_201_CREATED)
		self.assertEqual(len(mail.outbox), 1)
		self.assertIn('new.hire@example.com', mail.outbox[0].to)
		self.assertIn('Temp@1234', mail.outbox[0].body)


class MyProfileTests(APITestCase):
	def setUp(self):
		_set_current_user(None)
		self.org = make_org("Profile Org")
		self.employee = Employee.objects.create(
			first_name="Prof", last_name="Ile", email="profile.emp@example.com", gender="male",
			organization=self.org, role=Role.objects.get(name='EMPLOYEE'),
		)
		self.employee.set_password("Test@1234")
		self.employee.save()

	def test_can_view_and_update_own_profile(self):
		self.client.force_authenticate(user=self.employee)
		resp = self.client.get('/account/api/v1/me/')
		self.assertEqual(resp.status_code, status.HTTP_200_OK)
		self.assertEqual(resp.data['first_name'], 'Prof')

		resp = self.client.put(
			'/account/api/v1/me/update/',
			{'first_name': 'Updated', 'primary_phone': '+15551234567'},
			format='multipart',
		)
		self.assertEqual(resp.status_code, status.HTTP_200_OK)
		self.assertEqual(resp.data['first_name'], 'Updated')
		self.employee.refresh_from_db()
		self.assertEqual(self.employee.first_name, 'Updated')

	def test_cannot_touch_role_or_org_fields_via_profile_update(self):
		self.client.force_authenticate(user=self.employee)
		resp = self.client.put(
			'/account/api/v1/me/update/',
			{'first_name': 'Still Me'},
			format='multipart',
		)
		self.assertEqual(resp.status_code, status.HTTP_200_OK)
		self.assertNotIn('org_role', resp.data)
		self.assertNotIn('role', resp.data)
		self.assertNotIn('organization', resp.data)
