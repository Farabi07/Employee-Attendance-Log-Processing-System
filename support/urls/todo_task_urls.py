
from django.urls import path

from support.views import todo_task_views as views


urlpatterns = [
	path('api/v1/todo_task/all/', views.getAllToDoTask),

	path('api/v1/todo_task/without_pagination/', views.getAllToDoTaskWithoutPagination),

	path('api/v1/todo_task/get_all_by_user_id/<int:user_id>', views.getAllToDoTaskByUserId),

	path('api/v1/todo_task/<int:pk>', views.getAToDoTask),

	path('api/v1/todo_task/create/', views.createToDoTask),

	path('api/v1/todo_task/update/<int:pk>', views.updateToDoTask),
	
	path('api/v1/todo_task/delete/<int:pk>', views.deleteToDoTask),
]