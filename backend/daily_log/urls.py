from django.urls import path

from .views import LogEntryDetailView, LogEntryListCreateView, LogSummaryView


app_name = "daily_log"

urlpatterns = [
    path("entries/", LogEntryListCreateView.as_view(), name="entry-list-create"),
    path("entries/<uuid:pk>/", LogEntryDetailView.as_view(), name="entry-detail"),
    path("summary/", LogSummaryView.as_view(), name="summary"),
]

