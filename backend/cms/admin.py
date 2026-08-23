from django.contrib import admin

from cms.models import *



# Register your models here.

@admin.register(CMSMenu)
class CMSMenuAdmin(admin.ModelAdmin):
	list_display = [field.name for field in CMSMenu._meta.fields]


@admin.register(CMSMenuContent)
class CMSMenuContentAdmin(admin.ModelAdmin):
	list_display = [field.name for field in CMSMenuContent._meta.fields]



@admin.register(CMSMenuContentImage)
class CMSMenuContentImageAdmin(admin.ModelAdmin):
	list_display = [field.name for field in CMSMenuContentImage._meta.fields]

### adding email address




@admin.register(EmailAddress)
class EmailAddressAdmin(admin.ModelAdmin):
	list_display = [field.name for field in EmailAddress._meta.fields]


@admin.register(SendEmail)
class SendEmailAdmin(admin.ModelAdmin):

	list_display = [field.name for field in SendEmail._meta.fields]




@admin.register(Itinerary)
class ItineraryAdmin(admin.ModelAdmin):

	list_display = [field.name for field in Itinerary._meta.fields]


@admin.register(Blog)
class BlogAdmin(admin.ModelAdmin):

	list_display = [field.name for field in Blog._meta.fields]

@admin.register(Tag)
class TagAdmin(admin.ModelAdmin):

	list_display = [field.name for field in Tag._meta.fields]

@admin.register(BlogComments)
class BlogCommentsAdmin(admin.ModelAdmin):

	list_display = [field.name for field in BlogComments._meta.fields]

@admin.register(Review)
class ReviewAdmin(admin.ModelAdmin):

	list_display = [field.name for field in Review._meta.fields]

@admin.register(MetaData)
class MetaDataAdmin(admin.ModelAdmin):

	list_display = [field.name for field in MetaData._meta.fields]