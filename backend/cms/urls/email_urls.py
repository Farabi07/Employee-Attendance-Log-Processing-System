
from django.urls import path
from cms.views.email_views import store_and_send_email 

urlpatterns = [
    path('api/store-and-send-email/', store_and_send_email, name='store_and_send_email'),
    # Add other URL patterns as needed
]
