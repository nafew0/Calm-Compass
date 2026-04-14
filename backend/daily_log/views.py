from collections import Counter
from datetime import timedelta

from django.utils import timezone
from rest_framework import generics, permissions, status
from rest_framework.response import Response
from rest_framework.views import APIView

from subscriptions.services import LicenseService

from .models import LogEntry
from .serializers import LogEntrySerializer


class HasCalmCompassAccess(permissions.BasePermission):
    message = "You do not have access to CalmCompass."

    def has_permission(self, request, view):
        return LicenseService.has_calm_compass_access(request.user)


class LogEntryQuerysetMixin:
    permission_classes = [permissions.IsAuthenticated, HasCalmCompassAccess]

    def get_queryset(self):
        return LogEntry.objects.filter(user=self.request.user).select_related(
            "linked_behavior__category"
        )


class LogEntryListCreateView(LogEntryQuerysetMixin, generics.ListCreateAPIView):
    serializer_class = LogEntrySerializer

    def perform_create(self, serializer):
        serializer.save(user=self.request.user)


class LogEntryDetailView(LogEntryQuerysetMixin, generics.RetrieveUpdateDestroyAPIView):
    serializer_class = LogEntrySerializer


class LogSummaryView(APIView):
    permission_classes = [permissions.IsAuthenticated, HasCalmCompassAccess]

    def get(self, request):
        requested_range = (request.query_params.get("range") or "week").strip().lower()
        if requested_range != "week":
            return Response(
                {"range": "Only 'week' is supported in Phase 3."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        end_at = timezone.now()
        start_at = end_at - timedelta(days=7)
        queryset = LogEntry.objects.filter(
            user=request.user,
            created_at__gte=start_at,
        ).select_related("linked_behavior")

        mood_counter = Counter()
        for entry in queryset:
            mood_counter.update(entry.moods)

        mood_labels = LogEntry.mood_label_map()
        mood_counts = [
            {
                "mood": mood,
                "label": mood_labels[mood],
                "count": mood_counter.get(mood, 0),
            }
            for mood in LogEntry.ordered_moods()
        ]

        return Response(
            {
                "range": requested_range,
                "start_date": start_at.date().isoformat(),
                "end_date": end_at.date().isoformat(),
                "entry_count": queryset.count(),
                "linked_behavior_count": queryset.exclude(linked_behavior__isnull=True).count(),
                "mood_counts": mood_counts,
            }
        )

