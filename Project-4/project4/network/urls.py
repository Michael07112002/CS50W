
from django.urls import path

from . import views

urlpatterns = [
    path("", views.index, name="index"),
    path("login/", views.login_view, name="login"),
    path("logout/", views.logout_view, name="logout"),
    path("register/", views.register, name="register"),
    path("profile_page/<int:user_pk>/", views.profile_view, name="profile"),
    path("following/", views.following, name="following"),
    # API routes 

    # Posts routes
    path("posts/<int:post_pk>/", views.posts, name="post"),
    path("posts/<str:feed_type>/", views.posts, name="feed"),
    path("posts/", views.posts, name="create"),

    # Profile page routes
    path("profiles/<int:user_pk>/", views.profiles, name="profiles"), 

    path("like/<int:post_pk>/", views.like, name="like")
]
