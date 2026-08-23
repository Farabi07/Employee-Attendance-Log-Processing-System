
from django.urls import path
from authentication.views import department_views as views


urlpatterns = [
	path('api/v1/department/all/', views.getAllDepartment),

	path('api/v1/department/without_pagination/all/', views.getAllDepartmentWithoutPagination),

	path('api/v1/department/<int:pk>', views.getADepartment),

	path('api/v1/department/search/', views.searchDepartment),

	path('api/v1/department/create/', views.createDepartment),

	path('api/v1/department/update/<int:pk>', views.updateDepartment),

	path('api/v1/department/delete/<int:pk>', views.deleteDepartment),

]