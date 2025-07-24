from django.urls import path

from . import views

urlpatterns = [
    path("", views.index, name="index"),
    path("login/", views.login_view, name="login"),
    path("logout/", views.logout_view, name="logout"),
    path("register/", views.register, name="register"),
    path("create/", views.create, name="create"), 
    path("listing/<int:pk>/", views.listing_page, name="listing_page"),
    path("watchlist/", views.watchlist, name="watchlist"),
    path("search/", views.search_bar_input, name="search_bar_input"),
    path("make_bid/", views.make_bid, name="make_bid"),
    path("sales/", views.sales, name="sales"), 
    path("purchases/", views.purchases, name="purchases"),
    path("categories/", views.categories, name="categories"),
    path("categories/<str:category>/", views.categories, name="category"),
    path("search/<str:search_input>/", views.search, name="search") 
    ]
