from django.urls import path

from .views import (
    BehaviorCategoryDetailView,
    BehaviorCategoryListView,
    BehaviorDetailView,
    BehaviorListView,
    BehaviorViewTrackingView,
    DecoderStateView,
)


app_name = "knowledgebase"

urlpatterns = [
    path("me/last-viewed/", DecoderStateView.as_view(), name="last-viewed"),
    path("categories/", BehaviorCategoryListView.as_view(), name="category-list"),
    path("categories/<slug:slug>/", BehaviorCategoryDetailView.as_view(), name="category-detail"),
    path("behaviors/", BehaviorListView.as_view(), name="behavior-list"),
    path("behaviors/<slug:slug>/view/", BehaviorViewTrackingView.as_view(), name="behavior-view"),
    path("behaviors/<slug:slug>/", BehaviorDetailView.as_view(), name="behavior-detail"),
]
