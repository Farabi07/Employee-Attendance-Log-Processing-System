from rest_framework import status
from rest_framework.decorators import api_view, parser_classes, permission_classes
from rest_framework.parsers import JSONParser, MultiPartParser
from rest_framework.response import Response

from commons.pagination import Pagination
from finance.models import FinanceAuditLog
from .filters import ProductFilter
from .models import Product
from .permissions import CanManageProducts
from .serializers import ProductSerializer


def _audit(request, product_id, action, changes=None):
    FinanceAuditLog.objects.create(
        organization=request.user.organization,
        actor=request.user,
        entity_type="product",
        entity_id=product_id,
        action=action,
        changes=changes or {},
    )


@api_view(["GET", "POST"])
@parser_classes([MultiPartParser, JSONParser])
@permission_classes([CanManageProducts])
def product_list_create(request):
    queryset = Product.objects.filter(organization=request.user.organization).select_related("branch", "created_by")
    if request.method == "GET":
        queryset = ProductFilter(request.query_params, queryset=queryset).qs
        total = queryset.count()
        if request.query_params.get("page") or request.query_params.get("size"):
            pagination = Pagination()
            pagination.page = request.query_params.get("page")
            pagination.size = request.query_params.get("size")
            queryset = pagination.paginate_data(queryset)
            return Response({"products": ProductSerializer(queryset, many=True, context={"request": request}).data, "page": pagination.page, "size": pagination.size, "total_pages": pagination.total_pages, "total_elements": total})
        return Response({"products": ProductSerializer(queryset[:500], many=True, context={"request": request}).data, "total_elements": total})
    serializer = ProductSerializer(data=request.data, context={"request": request})
    serializer.is_valid(raise_exception=True)
    serializer.save(organization=request.user.organization, branch=getattr(request.user, "branch", None), created_by=request.user)
    _audit(request, serializer.instance.pk, "create")
    return Response(ProductSerializer(serializer.instance, context={"request": request}).data, status=status.HTTP_201_CREATED)


@api_view(["GET", "PATCH", "DELETE"])
@parser_classes([MultiPartParser, JSONParser])
@permission_classes([CanManageProducts])
def product_detail(request, pk):
    product = Product.objects.filter(pk=pk, organization=request.user.organization).first()
    if not product:
        return Response({"detail": "Product not found."}, status=status.HTTP_404_NOT_FOUND)
    if request.method == "GET":
        return Response(ProductSerializer(product, context={"request": request}).data)
    if request.method == "DELETE":
        _audit(request, product.pk, "delete")
        product.delete()
        return Response(status=status.HTTP_204_NO_CONTENT)
    serializer = ProductSerializer(product, data=request.data, partial=True, context={"request": request})
    serializer.is_valid(raise_exception=True)
    serializer.save()
    _audit(request, product.pk, "update")
    return Response(ProductSerializer(serializer.instance, context={"request": request}).data)
