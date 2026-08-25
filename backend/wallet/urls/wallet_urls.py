from django.urls import path

from wallet.views import wallet_views as views


urlpatterns = [
	path('api/v1/me/', views.getMyWallet),
	path('api/v1/payout/request/', views.requestPayout),

	path('api/v1/payroll/summary/', views.getPayrollSummary),
	path('api/v1/payroll/run/', views.runPayrollNow),
	path('api/v1/payout/<int:pk>/review/', views.reviewPayoutRequest),

	path('api/v1/transactions/', views.listTransactions),
]
