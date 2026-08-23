from django_filters import rest_framework as filters

from support.models import *





class TicketDepartmentFilter(filters.FilterSet):
    name = filters.CharFilter(field_name="name", lookup_expr='icontains')

    class Meta:
        model = TicketDepartment
        fields = ['name',]




class TicketPriorityFilter(filters.FilterSet):
    name = filters.CharFilter(field_name="name", lookup_expr='icontains')

    class Meta:
        model = TicketPriority
        fields = ['name',]




class TicketStatusFilter(filters.FilterSet):
    name = filters.CharFilter(field_name="name", lookup_expr='icontains')

    class Meta:
        model = TicketStatus
        fields = ['name',]




class TicketFilter(filters.FilterSet):
    user_name = filters.CharFilter(field_name="user__name", lookup_expr='icontains')

    class Meta:
        model = Ticket
        fields = ['user_name',]




class TicketDetailFilter(filters.FilterSet):
    customer = filters.CharFilter(field_name="customer__id", lookup_expr='icontains')

    class Meta:
        model = TicketDetail
        fields = ['customer',]




class MessageFilter(filters.FilterSet):
    sender = filters.CharFilter(field_name="sender__id", lookup_expr='exact')
    receiver = filters.CharFilter(field_name="receiver__id", lookup_expr='exact')

    class Meta:
        model = Message
        fields = ['sender', 'receiver']




class ToDoTaskFilter(filters.FilterSet):
    user = filters.CharFilter(field_name="user__id", lookup_expr='exact')
    task_type = filters.CharFilter(field_name="task_type__id", lookup_expr='exact')

    class Meta:
        model = ToDoTask
        fields = ['user', 'task_type',]



