from datetime import timedelta

from django.db.models import Prefetch
from django.utils import timezone
from rest_framework import generics, permissions, status
from rest_framework.response import Response
from rest_framework.views import APIView

from subscriptions.services import LicenseService

from .models import Medication, MedicationLog, MedicationSchedule
from .serializers import (
    MedicationLogSummarySerializer,
    MedicationLogUpsertSerializer,
    MedicationSerializer,
    MedicationSummarySerializer,
    UpcomingDoseSerializer,
)
from .services import generate_expected_doses


class HasCalmCompassAccess(permissions.BasePermission):
    message = "You do not have access to CalmCompass."

    def has_permission(self, request, view):
        return LicenseService.has_calm_compass_access(request.user)


def get_medication_base_queryset():
    return Medication.objects.select_related("user").prefetch_related(
        Prefetch(
            "schedules",
            queryset=MedicationSchedule.objects.order_by(
                "schedule_type",
                "time_of_day",
                "anchor_time",
                "created_at",
            ),
            to_attr="prefetched_schedules",
        ),
        Prefetch(
            "logs",
            queryset=MedicationLog.objects.order_by("-scheduled_for", "-logged_at"),
            to_attr="prefetched_logs",
        ),
    )


class MedicationListCreateView(generics.ListCreateAPIView):
    permission_classes = [permissions.IsAuthenticated, HasCalmCompassAccess]
    serializer_class = MedicationSerializer
    pagination_class = None

    def get_queryset(self):
        return get_medication_base_queryset().filter(
            user=self.request.user,
            is_active=True,
        )


class MedicationDetailView(generics.RetrieveUpdateDestroyAPIView):
    permission_classes = [permissions.IsAuthenticated, HasCalmCompassAccess]
    serializer_class = MedicationSerializer

    def get_queryset(self):
        return get_medication_base_queryset().filter(user=self.request.user)

    def perform_destroy(self, instance):
        instance.is_active = False
        instance.save(update_fields=["is_active", "updated_at"])


class UpcomingDosesView(APIView):
    permission_classes = [permissions.IsAuthenticated, HasCalmCompassAccess]

    def get(self, request):
        reference_time = timezone.now()
        window_end = reference_time + timedelta(hours=24)
        medications = list(
            get_medication_base_queryset().filter(
                user=request.user,
                is_active=True,
            )
        )

        logs = MedicationLog.objects.filter(
            medication__in=medications,
            scheduled_for__gte=reference_time,
            scheduled_for__lte=window_end,
        )
        log_map = {
            (str(log.medication_id), log.scheduled_for.isoformat()): log
            for log in logs
        }

        upcoming_doses = []
        for medication in medications:
            for scheduled_for in generate_expected_doses(
                medication,
                reference_time,
                window_end,
            ):
                log = log_map.get((str(medication.id), scheduled_for.isoformat()))
                upcoming_doses.append(
                    {
                        "medication": medication,
                        "scheduled_for": scheduled_for,
                        "status": log.status if log else None,
                        "logged_at": log.logged_at if log else None,
                    }
                )

        upcoming_doses.sort(key=lambda item: item["scheduled_for"])
        return Response(UpcomingDoseSerializer(upcoming_doses, many=True).data)


class MedicationLogUpsertView(APIView):
    permission_classes = [permissions.IsAuthenticated, HasCalmCompassAccess]

    def post(self, request):
        serializer = MedicationLogUpsertSerializer(
            data=request.data,
            context={"request": request},
        )
        serializer.is_valid(raise_exception=True)
        log = serializer.save()
        return Response(
            MedicationLogSummarySerializer(log).data,
            status=status.HTTP_200_OK,
        )


class MedicationAdherenceView(APIView):
    permission_classes = [permissions.IsAuthenticated, HasCalmCompassAccess]

    def get(self, request):
        requested_range = (request.query_params.get("range") or "week").strip().lower()
        if requested_range != "week":
            return Response(
                {"range": "Only 'week' is supported in Phase 4."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        end_at = timezone.now()
        start_at = end_at - timedelta(days=7)
        medications = list(
            get_medication_base_queryset().filter(user=request.user)
        )
        logs = MedicationLog.objects.filter(
            medication__in=medications,
            scheduled_for__gte=start_at,
            scheduled_for__lte=end_at,
        ).order_by("-scheduled_for")
        log_map = {
            (str(log.medication_id), log.scheduled_for.isoformat()): log
            for log in logs
        }

        overall_expected_count = 0
        overall_logged_count = 0
        overall_status_counts = {choice: 0 for choice, _ in MedicationLog.Status.choices}
        medication_rows = []

        for medication in medications:
            expected_doses = generate_expected_doses(medication, start_at, end_at)
            expected_count = len(expected_doses)
            status_counts = {choice: 0 for choice, _ in MedicationLog.Status.choices}
            logged_count = 0

            for scheduled_for in expected_doses:
                log = log_map.get((str(medication.id), scheduled_for.isoformat()))
                if log:
                    logged_count += 1
                    status_counts[log.status] += 1

            overall_expected_count += expected_count
            overall_logged_count += logged_count
            for status_key, count in status_counts.items():
                overall_status_counts[status_key] += count

            medication_rows.append(
                {
                    "medication": MedicationSummarySerializer(medication).data,
                    "expected_count": expected_count,
                    "logged_count": logged_count,
                    "pending_count": max(expected_count - logged_count, 0),
                    "taken_count": status_counts["taken"],
                    "skipped_count": status_counts["skipped"],
                    "refused_count": status_counts["refused"],
                    "adherence_percent": round(
                        (status_counts["taken"] / expected_count) * 100, 1
                    )
                    if expected_count
                    else 0.0,
                }
            )

        medication_rows.sort(
            key=lambda item: (
                -item["expected_count"],
                item["medication"]["name"].lower(),
            )
        )

        return Response(
            {
                "range": requested_range,
                "start_date": start_at.date(),
                "end_date": end_at.date(),
                "expected_count": overall_expected_count,
                "logged_count": overall_logged_count,
                "pending_count": max(
                    overall_expected_count - overall_logged_count,
                    0,
                ),
                "status_counts": [
                    {
                        "status": status_key,
                        "label": status_key.title(),
                        "count": overall_status_counts[status_key],
                    }
                    for status_key, _ in MedicationLog.Status.choices
                ],
                "medications": medication_rows,
            }
        )
