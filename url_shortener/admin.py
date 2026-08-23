from django.contrib import admin
from url_shortener.models import *

# Register your models here.
@admin.register(ShortenedURL)
class ShortenedURLAdmin(admin.ModelAdmin):
	list_display = [field.name for field in ShortenedURL._meta.fields]
