from django.utils import timezone
from rest_framework.test import APITestCase
from rest_framework import status

from django_currentuser.middleware import _set_current_user

from authentication.models import Branch, Employee, Organization
from attendance.models import Shift, Roster, AttendanceQRToken, Attendance, LeaveType, LeaveRequest, Notification


def make_org(name):
    return Organization.objects.create(name=name, trial_ends_at=None)


def make_manager(org, email, first="M", last="Manager"):
    u = Employee.objects.create(
        first_name=first, last_name=last, email=email, gender="male",
        organization=org, org_role=Employee.OrgRole.MANAGER,
    )
    u.set_password("Test@1234")
    u.save()
    return u


def make_employee(org, email, first="E", last="Employee"):
    u = Employee.objects.create(
        first_name=first, last_name=last, email=email, gender="male",
        organization=org, org_role=Employee.OrgRole.EMPLOYEE,
    )
    u.set_password("Test@1234")
    u.save()
    return u


class AttendanceFlowTests(APITestCase):
    def setUp(self):
        # authentication/signals.py stamps created_by via a django_currentuser
        # thread-local that isn't request-scoped, so a previous test's
        # authenticated user can leak in as a stale reference here. Reset it.
        _set_current_user(None)
        self.org = make_org("Test Org")
        self.branch = Branch.objects.create(name="Test Branch", organization=self.org)
        self.employee = make_employee(self.org, "test.employee@example.com")
        self.manager = make_manager(self.org, "test.manager@example.com")
        self.qr_token = AttendanceQRToken.objects.create(branch=self.branch)

    def test_checkin_checkout_happy_path(self):
        self.client.force_authenticate(user=self.employee)

        resp = self.client.post('/attendance/api/v1/attendance/checkin/', {'token': self.qr_token.current_code()}, format='json')
        self.assertEqual(resp.status_code, status.HTTP_200_OK)
        self.assertIsNotNone(resp.data['check_in_time'])

        resp = self.client.post('/attendance/api/v1/attendance/checkout/', {'token': self.qr_token.current_code()}, format='json')
        self.assertEqual(resp.status_code, status.HTTP_200_OK)
        self.assertIsNotNone(resp.data['check_out_time'])

        attendance = Attendance.objects.get(employee=self.employee, date=timezone.localdate())
        self.assertIsNotNone(attendance.worked_hours)

    def test_duplicate_checkin_rejected(self):
        self.client.force_authenticate(user=self.employee)
        self.client.post('/attendance/api/v1/attendance/checkin/', {'token': self.qr_token.current_code()}, format='json')

        resp = self.client.post('/attendance/api/v1/attendance/checkin/', {'token': self.qr_token.current_code()}, format='json')
        self.assertEqual(resp.status_code, status.HTTP_400_BAD_REQUEST)

    def test_checkin_with_invalid_token_rejected(self):
        self.client.force_authenticate(user=self.employee)
        resp = self.client.post('/attendance/api/v1/attendance/checkin/', {'token': 'not-a-real-token'}, format='json')
        self.assertEqual(resp.status_code, status.HTTP_400_BAD_REQUEST)

    def test_geofence_rejects_far_checkin(self):
        self.qr_token.latitude = 23.780636
        self.qr_token.longitude = 90.279488
        self.qr_token.allowed_radius_meters = 100
        self.qr_token.save()

        self.client.force_authenticate(user=self.employee)
        resp = self.client.post(
            '/attendance/api/v1/attendance/checkin/',
            {'token': self.qr_token.current_code(), 'lat': 23.9, 'lon': 90.4},
            format='json',
        )
        self.assertEqual(resp.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertFalse(Attendance.objects.filter(employee=self.employee).exclude(check_in_time=None).exists())

    def test_geofence_accepts_nearby_checkin(self):
        self.qr_token.latitude = 23.780636
        self.qr_token.longitude = 90.279488
        self.qr_token.allowed_radius_meters = 200
        self.qr_token.save()

        self.client.force_authenticate(user=self.employee)
        resp = self.client.post(
            '/attendance/api/v1/attendance/checkin/',
            {'token': self.qr_token.current_code(), 'lat': 23.780700, 'lon': 90.279500},
            format='json',
        )
        self.assertEqual(resp.status_code, status.HTTP_200_OK)


class RosterTests(APITestCase):
    def setUp(self):
        _set_current_user(None)
        self.org = make_org("Roster Org")
        self.employee = make_employee(self.org, "roster.emp@example.com")
        self.manager = make_manager(self.org, "roster.mgr@example.com")
        self.shift = Shift.objects.create(name="Morning", start_time="09:00:00", end_time="17:00:00", organization=self.org)
        self.today = timezone.localdate()

    def test_roster_unique_per_employee_per_day(self):
        Roster.objects.create(employee=self.employee, shift=self.shift, date=self.today)

        self.client.force_authenticate(user=self.manager)
        resp = self.client.post(
            '/roster/api/v1/roster/create/',
            {'employee': self.employee.id, 'shift': self.shift.id, 'date': str(self.today)},
            format='json',
        )
        self.assertEqual(resp.status_code, status.HTTP_400_BAD_REQUEST)

    def test_roster_create_notifies_employee(self):
        self.client.force_authenticate(user=self.manager)
        resp = self.client.post(
            '/roster/api/v1/roster/create/',
            {'employee': self.employee.id, 'shift': self.shift.id, 'date': str(self.today)},
            format='json',
        )
        self.assertEqual(resp.status_code, status.HTTP_201_CREATED)
        self.assertTrue(Notification.objects.filter(recipient=self.employee, notification_type='roster_assigned').exists())

    def test_employee_cannot_create_roster(self):
        self.client.force_authenticate(user=self.employee)
        resp = self.client.post(
            '/roster/api/v1/roster/create/',
            {'employee': self.employee.id, 'shift': self.shift.id, 'date': str(self.today)},
            format='json',
        )
        self.assertEqual(resp.status_code, status.HTTP_403_FORBIDDEN)


class LeaveRequestTests(APITestCase):
    def setUp(self):
        _set_current_user(None)
        self.org = make_org("Leave Org")
        self.employee = make_employee(self.org, "leave.emp@example.com")
        self.manager = make_manager(self.org, "leave.mgr@example.com")
        self.leave_type = LeaveType.objects.create(name="Sick", organization=self.org)
        self.today = timezone.localdate()

    def test_create_and_review_leave_request(self):
        self.client.force_authenticate(user=self.employee)
        resp = self.client.post(
            '/leave_request/api/v1/leave_request/create/',
            {'leave_type': self.leave_type.id, 'start_date': str(self.today), 'end_date': str(self.today), 'reason': 'test'},
            format='json',
        )
        self.assertEqual(resp.status_code, status.HTTP_201_CREATED)
        leave_id = resp.data['id']
        self.assertTrue(Notification.objects.filter(recipient=self.manager, notification_type='leave_submitted').exists())

        self.client.force_authenticate(user=self.manager)
        resp = self.client.post(
            f'/leave_request/api/v1/leave_request/review/{leave_id}',
            {'status': 'approved', 'review_note': 'ok'},
            format='json',
        )
        self.assertEqual(resp.status_code, status.HTTP_200_OK)
        self.assertEqual(LeaveRequest.objects.get(pk=leave_id).status, 'approved')
        self.assertTrue(Notification.objects.filter(recipient=self.employee, notification_type='leave_reviewed').exists())


class MultiTenantIsolationTests(APITestCase):
    """The whole point of the multi-tenant conversion: Org A must never be
    able to see or touch Org B's employees, branches, shifts, or attendance —
    even by guessing another org's object id."""

    def setUp(self):
        _set_current_user(None)
        self.org_a = make_org("Org A")
        self.org_b = make_org("Org B")

        self.manager_a = make_manager(self.org_a, "mgr.a@example.com", "Manager", "A")
        self.employee_a = make_employee(self.org_a, "emp.a@example.com", "Employee", "A")
        self.branch_a = Branch.objects.create(name="Branch A", organization=self.org_a)
        self.shift_a = Shift.objects.create(name="Shift A", start_time="09:00:00", end_time="17:00:00", organization=self.org_a)

        self.manager_b = make_manager(self.org_b, "mgr.b@example.com", "Manager", "B")
        self.employee_b = make_employee(self.org_b, "emp.b@example.com", "Employee", "B")
        self.branch_b = Branch.objects.create(name="Branch B", organization=self.org_b)

    def test_manager_cannot_list_other_orgs_employees(self):
        self.client.force_authenticate(user=self.manager_a)
        resp = self.client.get('/employee/api/v1/employee/without_paginaiton/all/')
        self.assertEqual(resp.status_code, status.HTTP_200_OK)
        emails = [e['email'] for e in resp.data['employees']]
        self.assertIn(self.employee_a.email, emails)
        self.assertNotIn(self.employee_b.email, emails)
        self.assertNotIn(self.manager_b.email, emails)

    def test_manager_cannot_fetch_other_orgs_employee_by_id(self):
        self.client.force_authenticate(user=self.manager_a)
        resp = self.client.get(f'/employee/api/v1/employee/{self.employee_b.id}')
        self.assertEqual(resp.status_code, status.HTTP_400_BAD_REQUEST)

    def test_manager_cannot_list_other_orgs_branches(self):
        self.client.force_authenticate(user=self.manager_a)
        resp = self.client.get('/branch/api/v1/branch/without_pagination/all/')
        self.assertEqual(resp.status_code, status.HTTP_200_OK)
        names = [b['name'] for b in resp.data['branches']]
        self.assertIn(self.branch_a.name, names)
        self.assertNotIn(self.branch_b.name, names)

    def test_manager_cannot_assign_roster_for_other_orgs_employee(self):
        self.client.force_authenticate(user=self.manager_a)
        resp = self.client.post(
            '/roster/api/v1/roster/create/',
            {'employee': self.employee_b.id, 'shift': self.shift_a.id, 'date': str(timezone.localdate())},
            format='json',
        )
        self.assertEqual(resp.status_code, status.HTTP_400_BAD_REQUEST)

    def test_employee_of_org_a_cannot_checkin_at_org_b_branch(self):
        qr_token_b = AttendanceQRToken.objects.create(branch=self.branch_b)
        self.client.force_authenticate(user=self.employee_a)
        resp = self.client.post('/attendance/api/v1/attendance/checkin/', {'token': qr_token_b.current_code()}, format='json')
        self.assertEqual(resp.status_code, status.HTTP_400_BAD_REQUEST)

    def test_manager_a_cannot_generate_qr_for_org_b_branch(self):
        self.client.force_authenticate(user=self.manager_a)
        resp = self.client.get(f'/attendance/api/v1/attendance/qr_token/{self.branch_b.id}/image/')
        self.assertEqual(resp.status_code, status.HTTP_400_BAD_REQUEST)

    def test_leave_submission_only_notifies_same_org_managers(self):
        LeaveType.objects.create(name="Sick", organization=self.org_a)
        leave_type_a = LeaveType.objects.get(organization=self.org_a)

        self.client.force_authenticate(user=self.employee_a)
        resp = self.client.post(
            '/leave_request/api/v1/leave_request/create/',
            {'leave_type': leave_type_a.id, 'start_date': str(timezone.localdate()), 'end_date': str(timezone.localdate())},
            format='json',
        )
        self.assertEqual(resp.status_code, status.HTTP_201_CREATED)
        self.assertTrue(Notification.objects.filter(recipient=self.manager_a, notification_type='leave_submitted').exists())
        self.assertFalse(Notification.objects.filter(recipient=self.manager_b, notification_type='leave_submitted').exists())


class RoleRestrictionTests(APITestCase):
    """Moderator can do everything except: create employees/moderators and
    manage a branch's QR code."""

    def setUp(self):
        _set_current_user(None)
        self.org = make_org("Role Org")
        self.manager = make_manager(self.org, "role.mgr@example.com")
        self.moderator = Employee.objects.create(
            first_name="Mod", last_name="Erator", email="role.mod@example.com", gender="male",
            organization=self.org, org_role=Employee.OrgRole.MODERATOR,
        )
        self.moderator.set_password("Test@1234")
        self.moderator.save()
        self.branch = Branch.objects.create(name="Role Branch", organization=self.org)

    def test_moderator_cannot_create_employee(self):
        self.client.force_authenticate(user=self.moderator)
        resp = self.client.post(
            '/employee/api/v1/employee/create/',
            {'first_name': 'New', 'last_name': 'Hire', 'email': 'blocked@example.com', 'password': 'x', 'gender': 'male'},
            format='json',
        )
        self.assertEqual(resp.status_code, status.HTTP_403_FORBIDDEN)

    def test_moderator_cannot_generate_branch_qr(self):
        self.client.force_authenticate(user=self.moderator)
        resp = self.client.get(f'/attendance/api/v1/attendance/qr_token/{self.branch.id}/image/')
        self.assertEqual(resp.status_code, status.HTTP_403_FORBIDDEN)

    def test_moderator_can_create_shift(self):
        self.client.force_authenticate(user=self.moderator)
        resp = self.client.post(
            '/shift/api/v1/shift/create/',
            {'name': 'Evening', 'start_time': '14:00:00', 'end_time': '22:00:00'},
            format='json',
        )
        self.assertEqual(resp.status_code, status.HTTP_201_CREATED)

    def test_manager_can_create_employee_with_moderator_role(self):
        self.client.force_authenticate(user=self.manager)
        resp = self.client.post(
            '/employee/api/v1/employee/create/',
            {'first_name': 'New', 'last_name': 'Mod', 'email': 'new.mod@example.com', 'password': 'Test@1234', 'gender': 'male', 'org_role': 'moderator'},
            format='json',
        )
        self.assertEqual(resp.status_code, status.HTTP_201_CREATED)
        self.assertEqual(resp.data['org_role'], 'moderator')
        self.assertEqual(resp.data['organization'], self.org.id)
