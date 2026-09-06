from django.utils import timezone
from rest_framework.test import APITestCase
from rest_framework import status

from django_currentuser.middleware import _set_current_user

from authentication.models import Branch, Employee, Organization, Role
from attendance.models import Shift, Roster, AttendanceQRToken, Attendance, LeaveType, LeaveRequest, Notification, Availability, ShiftSwapRequest


def make_org(name):
    return Organization.objects.create(name=name, trial_ends_at=None)


def make_manager(org, email, first="M", last="Manager"):
    u = Employee.objects.create(
        first_name=first, last_name=last, email=email, gender="male",
        organization=org, role=Role.objects.get(name='MANAGER'),
    )
    u.set_password("Test@1234")
    u.save()
    return u


def make_employee(org, email, first="E", last="Employee"):
    u = Employee.objects.create(
        first_name=first, last_name=last, email=email, gender="male",
        organization=org, role=Role.objects.get(name='EMPLOYEE'),
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
            organization=self.org, role=Role.objects.get(name='MODERATOR'),
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


class AvailabilityTests(APITestCase):
    def setUp(self):
        _set_current_user(None)
        self.org = make_org("Availability Org")
        self.manager = make_manager(self.org, "avail.mgr@example.com")
        self.employee = make_employee(self.org, "avail.emp@example.com")

    def test_employee_can_set_and_view_own_availability(self):
        self.client.force_authenticate(user=self.employee)
        resp = self.client.put(
            '/availability/api/v1/mine/update/',
            {
                'days': [
                    {'day_of_week': 0, 'is_available': True, 'start_time': '09:00', 'end_time': '17:00'},
                    {'day_of_week': 1, 'is_available': False},
                ]
            },
            format='json',
        )
        self.assertEqual(resp.status_code, status.HTTP_200_OK)
        self.assertEqual(Availability.objects.filter(employee=self.employee).count(), 2)

        resp = self.client.get('/availability/api/v1/mine/')
        self.assertEqual(resp.status_code, status.HTTP_200_OK)
        self.assertEqual(len(resp.data['availability']), 2)

    def test_manager_can_view_all_availability(self):
        Availability.objects.create(employee=self.employee, day_of_week=0, is_available=True)
        self.client.force_authenticate(user=self.manager)
        resp = self.client.get('/availability/api/v1/all/')
        self.assertEqual(resp.status_code, status.HTTP_200_OK)
        self.assertEqual(len(resp.data['availability']), 1)


class TimesheetTests(APITestCase):
    def setUp(self):
        _set_current_user(None)
        self.org = make_org("Timesheet Org")
        self.manager = make_manager(self.org, "ts.mgr@example.com")
        self.employee = make_employee(self.org, "ts.emp@example.com")
        today = timezone.localdate()
        Attendance.objects.create(
            employee=self.employee, date=today,
            check_in_time=timezone.now(), check_out_time=timezone.now(),
            worked_hours=8, status='present',
        )

    def test_employee_sees_only_own_timesheet(self):
        self.client.force_authenticate(user=self.employee)
        today = timezone.localdate()
        resp = self.client.get(f'/attendance/api/v1/timesheet/?date_from={today}&date_to={today}')
        self.assertEqual(resp.status_code, status.HTTP_200_OK)
        self.assertEqual(len(resp.data['rows']), 1)

    def test_manager_sees_org_timesheet(self):
        self.client.force_authenticate(user=self.manager)
        today = timezone.localdate()
        resp = self.client.get(f'/attendance/api/v1/timesheet/?date_from={today}&date_to={today}')
        self.assertEqual(resp.status_code, status.HTTP_200_OK)
        self.assertEqual(len(resp.data['rows']), 1)


class ShiftSwapTests(APITestCase):
    def setUp(self):
        _set_current_user(None)
        self.org = make_org("Swap Org")
        self.manager = make_manager(self.org, "swap.mgr@example.com")
        self.employee_a = make_employee(self.org, "swap.a@example.com", first="A")
        self.employee_b = make_employee(self.org, "swap.b@example.com", first="B")
        self.shift = Shift.objects.create(name="Morning", start_time="09:00", end_time="17:00", organization=self.org)
        self.roster = Roster.objects.create(
            employee=self.employee_a, shift=self.shift, date=timezone.localdate() + timezone.timedelta(days=1)
        )

    def test_targeted_swap_full_flow_reassigns_roster(self):
        self.client.force_authenticate(user=self.employee_a)
        resp = self.client.post(
            '/shift_swap/api/v1/request/',
            {'roster': self.roster.id, 'proposed_to': self.employee_b.id, 'reason': 'Doctor appointment'},
            format='json',
        )
        self.assertEqual(resp.status_code, status.HTTP_201_CREATED)
        swap_id = resp.data['id']
        self.assertTrue(Notification.objects.filter(recipient=self.employee_b, notification_type='swap_requested').exists())

        self.client.force_authenticate(user=self.employee_b)
        resp = self.client.post(f'/shift_swap/api/v1/{swap_id}/respond/', {'action': 'accept'}, format='json')
        self.assertEqual(resp.status_code, status.HTTP_200_OK)
        self.assertEqual(resp.data['status'], 'pending_manager')
        self.assertTrue(Notification.objects.filter(recipient=self.manager, notification_type='swap_claimed').exists())

        self.client.force_authenticate(user=self.manager)
        resp = self.client.post(f'/shift_swap/api/v1/{swap_id}/review/', {'action': 'approve'}, format='json')
        self.assertEqual(resp.status_code, status.HTTP_200_OK)
        self.roster.refresh_from_db()
        self.assertEqual(self.roster.employee_id, self.employee_b.id)
        self.assertTrue(Notification.objects.filter(recipient=self.employee_a, notification_type='swap_reviewed').exists())
        self.assertTrue(Notification.objects.filter(recipient=self.employee_b, notification_type='swap_reviewed').exists())

    def test_cannot_request_swap_for_someone_elses_shift(self):
        self.client.force_authenticate(user=self.employee_b)
        resp = self.client.post('/shift_swap/api/v1/request/', {'roster': self.roster.id}, format='json')
        self.assertEqual(resp.status_code, status.HTTP_400_BAD_REQUEST)

    def test_open_request_claimed_by_anyone(self):
        self.client.force_authenticate(user=self.employee_a)
        resp = self.client.post('/shift_swap/api/v1/request/', {'roster': self.roster.id}, format='json')
        swap_id = resp.data['id']

        self.client.force_authenticate(user=self.employee_b)
        resp = self.client.get('/shift_swap/api/v1/mine/')
        self.assertEqual(len(resp.data['open']), 1)

        resp = self.client.post(f'/shift_swap/api/v1/{swap_id}/respond/', {'action': 'accept'}, format='json')
        self.assertEqual(resp.status_code, status.HTTP_200_OK)
        self.assertEqual(resp.data['status'], 'pending_manager')


class LeaveBalanceTests(APITestCase):
    def setUp(self):
        _set_current_user(None)
        self.org = make_org("Leave Balance Org")
        self.manager = make_manager(self.org, "balance.mgr@example.com")
        self.employee = make_employee(self.org, "balance.emp@example.com")
        self.casual = LeaveType.objects.create(name="Casual", organization=self.org, days_per_year=10)

    def test_balance_reflects_approved_leave_only(self):
        today = timezone.localdate()
        LeaveRequest.objects.create(
            employee=self.employee, leave_type=self.casual,
            start_date=today, end_date=today + timezone.timedelta(days=2),
            status=LeaveRequest.Status.APPROVED,
        )
        # A pending request shouldn't count against the quota yet.
        LeaveRequest.objects.create(
            employee=self.employee, leave_type=self.casual,
            start_date=today + timezone.timedelta(days=10), end_date=today + timezone.timedelta(days=10),
            status=LeaveRequest.Status.PENDING,
        )

        self.client.force_authenticate(user=self.employee)
        resp = self.client.get('/leave_request/api/v1/leave_request/balance/mine/')
        self.assertEqual(resp.status_code, status.HTTP_200_OK)
        row = next(r for r in resp.data['balance'] if r['leave_type_id'] == self.casual.id)
        self.assertEqual(row['days_per_year'], 10)
        self.assertEqual(row['used'], 3)
        self.assertEqual(row['remaining'], 7)
