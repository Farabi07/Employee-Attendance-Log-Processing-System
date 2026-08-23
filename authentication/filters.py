from authentication.models import *
from django_filters import rest_framework as filters





class AreaFilter(filters.FilterSet):
    name = filters.CharFilter(field_name="name", lookup_expr='icontains')

    class Meta:
        model = Area
        fields = ['name', ]




class BranchFilter(filters.FilterSet):
    name = filters.CharFilter(field_name="name", lookup_expr='icontains')

    class Meta:
        model = Branch
        fields = ['name', ]




class CityFilter(filters.FilterSet):
    name = filters.CharFilter(field_name="name", lookup_expr='icontains')

    class Meta:
        model = City
        fields = ['name', ]




class CountryFilter(filters.FilterSet):
    name = filters.CharFilter(field_name="name", lookup_expr='icontains')

    class Meta:
        model = Country
        fields = ['name', ]




class CustomerTypeFilter(filters.FilterSet):
    name = filters.CharFilter(field_name="name", lookup_expr='icontains')

    class Meta:
        model = CustomerType
        fields = ['name', ]




class CustomerFilter(filters.FilterSet):
    name = filters.CharFilter(field_name="name", lookup_expr='icontains')

    class Meta:
        model = Customer
        fields = ['username', ]




class DepartmentFilter(filters.FilterSet):
    name = filters.CharFilter(field_name="name", lookup_expr='icontains')

    class Meta:
        model = Department
        fields = ['name', ]




class PermissionFilter(filters.FilterSet):
    name = filters.CharFilter(field_name="name", lookup_expr='icontains')

    class Meta:
        model = Permission
        fields = ['name', ]




class QualificationFilter(filters.FilterSet):
    degree_name = filters.CharFilter(field_name="degree_name", lookup_expr='icontains')

    class Meta:
        model = Qualification
        fields = ['degree_name', ]




class RoleFilter(filters.FilterSet):
    name = filters.CharFilter(field_name="name", lookup_expr='icontains')

    class Meta:
        model = Role
        fields = ['name', ]




class DesignationFilter(filters.FilterSet):
    name = filters.CharFilter(field_name="name", lookup_expr='icontains')

    class Meta:
        model = Designation
        fields = ['name', ]




class ThanaFilter(filters.FilterSet):
    name = filters.CharFilter(field_name="name", lookup_expr='icontains')

    class Meta:
        model = Thana
        fields = ['name', ]




class UserFilter(filters.FilterSet):
    username = filters.CharFilter(field_name="username", lookup_expr='icontains')

    class Meta:
        model = User
        fields = ['username', ]




class EmployeeFilter(filters.FilterSet):
    username = filters.CharFilter(field_name="username", lookup_expr='icontains')

    class Meta:
        model = Employee
        fields = ['username', ]




class VendorFilter(filters.FilterSet):
    username = filters.CharFilter(field_name="username", lookup_expr='icontains')

    class Meta:
        model = Vendor
        fields = ['username', ]




class CustomerFilter(filters.FilterSet):
    username = filters.CharFilter(field_name="username", lookup_expr='icontains')

    class Meta:
        model = Customer
        fields = ['username', ]




class LoginHistoryFilter(filters.FilterSet):
    username = filters.CharFilter(field_name="user__username", lookup_expr='icontains')

    class Meta:
        model = LoginHistory
        fields = ['username', ]




