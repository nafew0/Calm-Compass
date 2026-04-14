from django.db import transaction
from django.utils import timezone
from rest_framework import serializers

from .models import Medication, MedicationLog, MedicationSchedule
from .services import (
    WEEKDAY_VALUES,
    WEEKDAY_LABELS,
    build_schedule_summary,
    generate_expected_doses,
    normalize_days_of_week,
)


class MedicationScheduleSerializer(serializers.ModelSerializer):
    class Meta:
        model = MedicationSchedule
        fields = [
            "id",
            "schedule_type",
            "time_of_day",
            "days_of_week",
            "interval_hours",
            "anchor_time",
        ]
        read_only_fields = ["id"]

    def validate_days_of_week(self, value):
        normalized = normalize_days_of_week(value)
        invalid_days = [day for day in normalized if day not in WEEKDAY_VALUES]
        if invalid_days:
            raise serializers.ValidationError(
                "Invalid days of week: " + ", ".join(sorted(invalid_days))
            )
        return normalized

    def validate(self, attrs):
        schedule_type = attrs.get("schedule_type")
        days_of_week = attrs.get("days_of_week", [])

        if schedule_type == MedicationSchedule.ScheduleType.FIXED:
            if not attrs.get("time_of_day"):
                raise serializers.ValidationError(
                    {"time_of_day": "Time of day is required."}
                )
            attrs["days_of_week"] = days_of_week
            attrs["interval_hours"] = None
            attrs["anchor_time"] = None
            return attrs

        if schedule_type == MedicationSchedule.ScheduleType.INTERVAL:
            interval_hours = attrs.get("interval_hours")
            if not interval_hours:
                raise serializers.ValidationError(
                    {"interval_hours": "Interval hours are required."}
                )
            if interval_hours < 1 or interval_hours > 24:
                raise serializers.ValidationError(
                    {"interval_hours": "Interval hours must be between 1 and 24."}
                )
            if not attrs.get("anchor_time"):
                raise serializers.ValidationError(
                    {"anchor_time": "Anchor time is required."}
                )
            attrs["time_of_day"] = None
            attrs["days_of_week"] = []
            return attrs

        raise serializers.ValidationError(
            {"schedule_type": "Schedule type must be fixed or interval."}
        )


class MedicationLogSummarySerializer(serializers.ModelSerializer):
    class Meta:
        model = MedicationLog
        fields = [
            "id",
            "scheduled_for",
            "status",
            "logged_at",
            "medication_name_snapshot",
            "dose_snapshot",
        ]


class MedicationSerializer(serializers.ModelSerializer):
    schedules = MedicationScheduleSerializer(many=True)
    schedule_summary = serializers.SerializerMethodField()
    latest_log = serializers.SerializerMethodField()

    class Meta:
        model = Medication
        fields = [
            "id",
            "name",
            "dose",
            "is_active",
            "schedule_summary",
            "schedules",
            "latest_log",
            "created_at",
            "updated_at",
        ]
        read_only_fields = [
            "id",
            "is_active",
            "schedule_summary",
            "latest_log",
            "created_at",
            "updated_at",
        ]

    def validate_name(self, value):
        normalized = (value or "").strip()
        if not normalized:
            raise serializers.ValidationError("Medication name is required.")
        return normalized

    def validate_dose(self, value):
        normalized = (value or "").strip()
        if not normalized:
            raise serializers.ValidationError("Dose is required.")
        return normalized

    def validate_schedules(self, value):
        if not value:
            raise serializers.ValidationError("At least one schedule is required.")

        schedule_types = {item["schedule_type"] for item in value}
        if len(schedule_types) > 1:
            raise serializers.ValidationError(
                "All schedules for a medication must use the same schedule type."
            )

        schedule_type = next(iter(schedule_types))
        if (
            schedule_type == MedicationSchedule.ScheduleType.INTERVAL
            and len(value) != 1
        ):
            raise serializers.ValidationError(
                "Interval medications must have exactly one schedule row."
            )

        return value

    @transaction.atomic
    def create(self, validated_data):
        schedules_data = validated_data.pop("schedules")
        medication = Medication.objects.create(
            user=self.context["request"].user,
            **validated_data,
        )
        self._replace_schedules(medication, schedules_data)
        return medication

    @transaction.atomic
    def update(self, instance, validated_data):
        schedules_data = validated_data.pop("schedules", None)

        for field, value in validated_data.items():
            setattr(instance, field, value)
        instance.save()

        if schedules_data is not None:
            self._replace_schedules(instance, schedules_data)

        return instance

    def get_schedule_summary(self, obj):
        schedules = getattr(obj, "prefetched_schedules", None)
        if schedules is None:
            schedules = obj.schedules.all()
        return build_schedule_summary(schedules)

    def get_latest_log(self, obj):
        logs = getattr(obj, "prefetched_logs", None)
        latest_log = logs[0] if logs else obj.logs.order_by("-scheduled_for").first()
        if not latest_log:
            return None
        return MedicationLogSummarySerializer(latest_log).data

    def _replace_schedules(self, medication, schedules_data):
        medication.schedules.all().delete()
        MedicationSchedule.objects.bulk_create(
            [MedicationSchedule(medication=medication, **item) for item in schedules_data]
        )


class MedicationSummarySerializer(serializers.ModelSerializer):
    schedule_summary = serializers.SerializerMethodField()

    class Meta:
        model = Medication
        fields = ["id", "name", "dose", "is_active", "schedule_summary"]

    def get_schedule_summary(self, obj):
        schedules = getattr(obj, "prefetched_schedules", None)
        if schedules is None:
            schedules = obj.schedules.all()
        return build_schedule_summary(schedules)


class UpcomingDoseSerializer(serializers.Serializer):
    medication = MedicationSummarySerializer()
    scheduled_for = serializers.DateTimeField()
    status = serializers.CharField(allow_null=True)
    logged_at = serializers.DateTimeField(allow_null=True)


class MedicationLogUpsertSerializer(serializers.Serializer):
    medication_id = serializers.PrimaryKeyRelatedField(
        source="medication",
        queryset=Medication.objects.all(),
    )
    scheduled_for = serializers.DateTimeField()
    status = serializers.ChoiceField(choices=MedicationLog.Status.choices)

    def validate(self, attrs):
        medication = attrs["medication"]
        request = self.context["request"]

        if medication.user_id != request.user.id:
            raise serializers.ValidationError(
                {"medication_id": "Medication not found."}
            )

        if timezone.is_naive(attrs["scheduled_for"]):
            raise serializers.ValidationError(
                {"scheduled_for": "Scheduled time must include timezone information."}
            )

        return attrs

    def save(self, **kwargs):
        medication = self.validated_data["medication"]
        scheduled_for = self.validated_data["scheduled_for"]
        status = self.validated_data["status"]

        log, created = MedicationLog.objects.get_or_create(
            medication=medication,
            scheduled_for=scheduled_for,
            defaults={
                "status": status,
                "medication_name_snapshot": medication.name,
                "dose_snapshot": medication.dose,
            },
        )

        if not created:
            log.status = status
            log.save(update_fields=["status", "logged_at"])

        return log


class AdherenceSummarySerializer(serializers.Serializer):
    range = serializers.CharField()
    start_date = serializers.DateField()
    end_date = serializers.DateField()
    expected_count = serializers.IntegerField()
    logged_count = serializers.IntegerField()
    pending_count = serializers.IntegerField()
    status_counts = serializers.ListField()
    medications = serializers.ListField()
