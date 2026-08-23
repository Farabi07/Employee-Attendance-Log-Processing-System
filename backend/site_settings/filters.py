from django_filters import rest_framework as filters

from site_settings.models import Contact, MenuItem, GeneralSetting, HomePageSlider, Contact





class MenuItemFilter(filters.FilterSet):
    title = filters.CharFilter(field_name="title", lookup_expr='icontains')

    class Meta:
        model = MenuItem
        fields = ['title', ]




class GeneralSettingFilter(filters.FilterSet):
    title = filters.CharFilter(field_name="title", lookup_expr='icontains')

    class Meta:
        model = GeneralSetting
        fields = ['title', ]




class HomePageSliderFilter(filters.FilterSet):
    title = filters.CharFilter(field_name="title", lookup_expr='icontains')

    class Meta:
        model = HomePageSlider
        fields = ['title', ]




class ContactFilter(filters.FilterSet):
    email = filters.CharFilter(field_name="email", lookup_expr='icontains')

    class Meta:
        model = Contact
        fields = ['email', ]



