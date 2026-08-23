"""start_project URL Configuration."""

from django.conf import settings
from django.contrib import admin
from django.urls import include, path, re_path
from django.views.static import serve
from drf_spectacular.views import (SpectacularAPIView, SpectacularRedocView, SpectacularSwaggerView)

from . import views

urlpatterns = [
    path('admin/', admin.site.urls),

    path('', views.index),

    #url shortner
    path('redirect/', include('url_shortener.urls.shortner_urls')),

    # Authentication module
    path('user/', include('authentication.urls.user_urls')),
    path('employee/', include('authentication.urls.employee_urls')),
    path('vendor/', include('authentication.urls.vendor_urls')),
    path('customer_type/', include('authentication.urls.customer_type_urls')),
    path('customer/', include('authentication.urls.customer_urls')),
    path('permission/', include('authentication.urls.permission_urls')),
    path('role/', include('authentication.urls.role_urls')),
    path('designation/', include('authentication.urls.designation_urls')),
    path('department/', include('authentication.urls.department_urls')),
    path('qualification/', include('authentication.urls.qualification_urls')),
    path('country/', include('authentication.urls.country_urls')),
    path('thana/', include('authentication.urls.thana_urls')),
    path('area/', include('authentication.urls.area_urls')),
    path('branch/', include('authentication.urls.branch_urls')),
    path('city/', include('authentication.urls.city_urls')),


	# CMS
	path('cms_menu/', include('cms.urls.cms_menu_urls')),
	path('cms_menu_content/', include('cms.urls.cms_menu_content_urls')),
	path('cms_menu_content_image/', include('cms.urls.cms_menu_content_image_urls')),
    path('cms_blog/',include('cms.urls.blog_urls')),
    path('cms_blog_comments/',include('cms.urls.blog_comment_urls')),
    path('cms_review/',include('cms.urls.cms_review_urls')),
    path('email/', include('cms.urls.email_urls')),
    path('send-email/', include('cms.urls.send_email_urls')),
    path('cms_itinerary/', include('cms.urls.itinerary_urls')),
    path('cms_meta_data/', include('cms.urls.cms_meta_data_urls')),

	# Site Settings module
	path('general_setting/', include('site_settings.urls.general_setting_urls')),
	path('homepage_slider/', include('site_settings.urls.homepage_slider_urls')),


	# Support module
	path('ticket_department/', include('support.urls.ticket_department_urls')),
	path('ticket_priority/', include('support.urls.ticket_priority_urls')),
	path('ticket_status/', include('support.urls.ticket_status_urls')),
	path('ticket/', include('support.urls.ticket_urls')),
	path('ticket_detail/', include('support.urls.ticket_detail_urls')),

	path('message/', include('support.urls.message_urls')),

	path('task_type/', include('support.urls.task_type_urls')),
	path('todo_task/', include('support.urls.todo_task_urls')),


	# Attendance module
	path('shift/', include('attendance.urls.shift_urls')),
	path('roster/', include('attendance.urls.roster_urls')),
	path('leave_type/', include('attendance.urls.leave_type_urls')),
	path('leave_request/', include('attendance.urls.leave_request_urls')),
	path('attendance/', include('attendance.urls.attendance_urls')),
	path('notification/', include('attendance.urls.notification_urls')),

	# Multi-tenant SaaS: signup + platform owner
	path('saas/', include('authentication.urls.signup_urls')),
	path('billing/', include('billing.urls.billing_urls')),


	# YOUR PATTERNS
    path('schema/', SpectacularAPIView.as_view(), name='schema'),
    # Optional UI:
    path('schema/swagger-ui/', SpectacularSwaggerView.as_view(url_name='schema'), name='swagger-ui'),
    path('schema/redoc/', SpectacularRedocView.as_view(url_name='schema'), name='redoc'),

    path('djoser/auth/', include('djoser.urls')),
    path('djoser/auth/', include('djoser.urls.jwt')),

	re_path(r'^media/(?P<path>.*)$', serve,{'document_root': settings.MEDIA_ROOT}), 
    re_path(r'^static/(?P<path>.*)$', serve, {'document_root': settings.STATIC_ROOT}),
]
