from rest_framework import serializers

from .models import Product


class ProductSerializer(serializers.ModelSerializer):
    class Meta:
        model = Product
        fields = ("id", "name", "category", "description", "image", "price", "offer_price", "offer_active", "is_available", "sku", "branch", "created_by", "created_at", "updated_at")
        read_only_fields = ("id", "branch", "created_by", "created_at", "updated_at")

    def validate(self, attrs):
        price = attrs.get("price", getattr(self.instance, "price", None))
        offer = attrs.get("offer_price", getattr(self.instance, "offer_price", None))
        if price is not None and price <= 0:
            raise serializers.ValidationError({"price": "Price must be greater than zero."})
        if offer is not None and offer <= 0:
            raise serializers.ValidationError({"offer_price": "Offer price must be greater than zero."})
        if offer is not None and price is not None and offer > price:
            raise serializers.ValidationError({"offer_price": "Offer price cannot exceed regular price."})
        if attrs.get("offer_active") and offer is None and not getattr(self.instance, "offer_price", None):
            raise serializers.ValidationError({"offer_price": "Add an offer price before activating the offer."})
        return attrs
