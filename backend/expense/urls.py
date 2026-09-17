from django.urls import path

from . import views

urlpatterns = [
    path("api/v1/expense/summary/", views.expense_summary),
    path("api/v1/expense/all/", views.expense_list),
    path("api/v1/expense/create/", views.expense_create),
    path("api/v1/expense/<int:pk>/", views.expense_detail),
    path("api/v1/expense/categories/", views.expense_categories),
    path("api/v1/expense/categories/<int:pk>/", views.expense_category_detail),
    path("api/v1/expense/import/excel/", views.expense_import_excel),
    path("api/v1/expense/template/", views.expense_template),
    path("api/v1/expense/receipt/extract/", views.expense_receipt_extract),
    path("api/v1/expense/income/create/", views.income_create),
    path("api/v1/expense/income/all/", views.income_list),
    path("api/v1/expense/income/import/excel/", views.income_import_excel),
]
