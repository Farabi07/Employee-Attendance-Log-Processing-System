
from django.urls import path

from support.views import task_type_views as views


urlpatterns = [
	path('api/v1/task_type/all/', views.getAllTaskType),

	path('api/v1/task_type/without_pagination/', views.getAllTaskTypeWithoutPagination),

	path('api/v1/task_type/<int:pk>', views.getATaskType),

	path('api/v1/task_type/create/', views.createTaskType),

	path('api/v1/task_type/update/<int:pk>', views.updateTaskType),
	
	path('api/v1/task_type/delete/<int:pk>', views.deleteTaskType),
]