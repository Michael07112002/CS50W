from django.urls import path

from . import views

urlpatterns = [
    path("wiki/", views.index, name="index"),
    path("wiki/search/", views.search, name="search"),
    path("wiki/create/", views.create, name="create"), 
    path("wiki/random_entry/", views.random_entry, name="random_entry"),
    path("wiki/<str:title>/edit", views.edit, name="edit"),
    path("wiki/<str:title>/", views.entry, name="entry")
]
