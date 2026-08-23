
from django.urls import path

from cms.views import cms_blog_comment_views as views


urlpatterns = [

	path('api/v1/cms_blog_comment/all/', views.getAllBlogComments),

	# path('api/v1/cms_blog_comment/without_pagination/all/', views.getAllBlogCommentsWithoutPagination),
    path('api/v1/cms_blog_comment/search/', views.searchBlogComments),

	path('api/v1/cms_blog_comment/<int:pk>', views.getBlogComments),

	path('api/v1/cms_blog_comment/create/', views.createBlogComments),

	path('api/v1/cms_blog_comment/update/<int:pk>', views.updateBlogComments),
	
	path('api/v1/cms_blog_comment/delete/<int:pk>', views.deleteBlogComments),
    
	path('api/v1/cms_blog_comment/get_blog_commentBy_blog_title/<title>', views.getBlogCommentsByTitle),
    
	path('api/v1/cms_blog_comment/vote_comment/<int:comment_id>/<str:vote_type>/', views.vote_comment, name='vote_comment'),


]