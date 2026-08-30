from django.urls import path

from wallet.views import wallet_views as views


urlpatterns = [
	path('api/v1/me/', views.getMyWallet),
	path('api/v1/payout/request/', views.requestPayout),
	path('api/v1/connect/onboard/', views.connectOnboard),
	path('api/v1/connect/status/', views.connectStatus),

	path('api/v1/payroll/summary/', views.getPayrollSummary),
	path('api/v1/payroll/run/', views.runPayrollNow),
	path('api/v1/payroll/export/csv/', views.exportPayrollCsv),
	path('api/v1/payroll/export/pdf/', views.exportPayrollPdf),
	path('api/v1/payroll/export/excel/', views.exportPayrollExcel),
	path('api/v1/payout/<int:pk>/review/', views.reviewPayoutRequest),
	path('api/v1/payout/confirm/', views.confirmPayoutCheckout),

	path('api/v1/transactions/', views.listTransactions),

	path('api/v1/rate_history/<int:employee_id>/', views.getRateHistory),

	path('api/v1/pay_adjustment/eligible/', views.getEligiblePayAdjustments),
	path('api/v1/pay_adjustment/request/', views.createPayAdjustmentRequest),
	path('api/v1/pay_adjustment/mine/', views.listMyPayAdjustments),
	path('api/v1/pay_adjustment/all/', views.listOrgPayAdjustments),
	path('api/v1/pay_adjustment/<int:pk>/review/', views.reviewPayAdjustment),
	path('api/v1/pay_adjustment/<int:pk>/accept/', views.acceptPayAdjustment),
]
