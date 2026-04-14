from django.urls import path

from .views import (
    MedicationAdherenceView,
    MedicationDetailView,
    MedicationListCreateView,
    MedicationLogUpsertView,
    UpcomingDosesView,
)


app_name = "medications"

urlpatterns = [
    path("", MedicationListCreateView.as_view(), name="medication-list-create"),
    path("<uuid:pk>/", MedicationDetailView.as_view(), name="medication-detail"),
    path("upcoming/", UpcomingDosesView.as_view(), name="upcoming-doses"),
    path("adherence/", MedicationAdherenceView.as_view(), name="adherence"),
    path("logs/", MedicationLogUpsertView.as_view(), name="log-upsert"),
]
