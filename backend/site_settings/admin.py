from django.contrib import admin

from site_settings.models import *



# Register your models here.

@admin.register(MenuItem)
class MenuItemAdmin(admin.ModelAdmin):
	list_display = [field.name for field in MenuItem._meta.fields]


@admin.register(RoleMenu)
class RoleMenuAdmin(admin.ModelAdmin):
	list_display = [field.name for field in RoleMenu._meta.fields]


@admin.register(GeneralSetting)
class GeneralSettingAdmin(admin.ModelAdmin):
	list_display = [field.name for field in GeneralSetting._meta.fields]


@admin.register(HomePageSlider)
class HomePageSliderAdmin(admin.ModelAdmin):
	list_display = [field.name for field in HomePageSlider._meta.fields]


