from django.urls import path

from product.views import product_views as views


urlpatterns = [
    path("api/v1/business/products/", views.product_list_create),
    path("api/v1/business/products/<int:pk>/", views.product_detail),
]
