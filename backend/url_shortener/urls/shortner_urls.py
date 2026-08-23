from django.urls import path
from url_shortener.views import shortner_views as views

urlpatterns = [
    path('generate/', views.shorten_url_and_redirect, name='shorten_url'),
    path('<str:short_code>/', views.get_redirected_url, name='redirect_to_original'),
]
