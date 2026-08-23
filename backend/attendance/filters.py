from attendance.models import *
from django_filters import rest_framework as filters




class ShiftFilter(filters.FilterSet):
    name = filters.CharFilter(field_name="name", lookup_expr='icontains')

    class Meta:
        model = Shift
        fields = ['name', ]




class RosterFilter(filters.FilterSet):
    date = filters.DateFilter(field_name="date")
    date_from = filters.DateFilter(field_name="date", lookup_expr='gte')
    date_to = filters.DateFilter(field_name="date", lookup_expr='lte')

    class Meta:
        model = Roster
        fields = ['date', ]




class AttendanceFilter(filters.FilterSet):
    date = filters.DateFilter(field_name="date")
    date_from = filters.DateFilter(field_name="date", lookup_expr='gte')
    date_to = filters.DateFilter(field_name="date", lookup_expr='lte')
    status = filters.CharFilter(field_name="status")

    class Meta:
        model = Attendance
        fields = ['date', 'status', ]




class LeaveTypeFilter(filters.FilterSet):
    name = filters.CharFilter(field_name="name", lookup_expr='icontains')

    class Meta:
        model = LeaveType
        fields = ['name', ]




class LeaveRequestFilter(filters.FilterSet):
    status = filters.CharFilter(field_name="status")

    class Meta:
        model = LeaveRequest
        fields = ['status', ]
