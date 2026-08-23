
from django.urls import path

from cms.views import cms_blog_views as views


urlpatterns = [

	path('api/v1/cms_blog/all/', views.getAllBlog),

	# path('api/v1/cms_blog/without_pagination/all/', views.getAllBlogWithoutPagination),
    path('api/v1/cms_blog/search/', views.searchBlog),

	path('api/v1/cms_blog/<int:pk>', views.getBlog),

	path('api/v1/cms_blog/create/', views.createBlog),

	path('api/v1/cms_blog/update/<int:pk>', views.updateBlog),
	
	path('api/v1/cms_blog/delete/<int:pk>', views.deleteBlog),
    
	path('api/v1/cms_blog/get_blogBy_blog_title/<title>', views.getBlogByTitle),


]