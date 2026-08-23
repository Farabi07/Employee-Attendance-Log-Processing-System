from django.urls import path
from cms.views.send_email_views import send_email 

urlpatterns = [
    path('api/send-email/', send_email, name='send_email'),
    
]