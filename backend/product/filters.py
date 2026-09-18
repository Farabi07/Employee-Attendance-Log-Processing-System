from django_filters import rest_framework as filters

from .models import Product


class ProductFilter(filters.FilterSet):
    name = filters.CharFilter(field_name="name", lookup_expr="icontains")
    category = filters.CharFilter(field_name="category", lookup_expr="iexact")
    available = filters.BooleanFilter(field_name="is_available")
    offer = filters.BooleanFilter(field_name="offer_active")
    min_price = filters.NumberFilter(field_name="price", lookup_expr="gte")
    max_price = filters.NumberFilter(field_name="price", lookup_expr="lte")

    class Meta:
        model = Product
        fields = ("name", "category", "available", "offer", "min_price", "max_price")
