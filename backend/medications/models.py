import uuid

from django.conf import settings
from django.core.exceptions import ValidationError
from django.db import models

from .services import WEEKDAY_VALUES, normalize_days_of_week


class Medication(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="medications",
    )
    name = models.CharField(max_length=200)
    dose = models.CharField(max_length=120)
    is_active = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ["name", "created_at"]
        indexes = [
            models.Index(fields=["user", "is_active", "name"]),
        ]

    def __str__(self):
        return f"{self.name} ({self.dose})"

    def clean(self):
        self.name = (self.name or "").strip()
        self.dose = (self.dose or "").strip()

        if not self.name:
            raise ValidationError({"name": "Medication name is required."})
        if not self.dose:
            raise ValidationError({"dose": "Dose is required."})

    def save(self, *args, **kwargs):
        self.full_clean()
        super().save(*args, **kwargs)


class MedicationSchedule(models.Model):
    class ScheduleType(models.TextChoices):
        FIXED = "fixed", "Fixed"
        INTERVAL = "interval", "Interval"

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    medication = models.ForeignKey(
        Medication,
        on_delete=models.CASCADE,
        related_name="schedules",
    )
    schedule_type = models.CharField(max_length=20, choices=ScheduleType.choices)
    time_of_day = models.TimeField(null=True, blank=True)
    days_of_week = models.JSONField(default=list, blank=True)
    interval_hours = models.PositiveSmallIntegerField(null=True, blank=True)
    anchor_time = models.TimeField(null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ["time_of_day", "anchor_time", "created_at"]

    def __str__(self):
        return f"{self.medication.name} schedule"

    def clean(self):
        self.days_of_week = normalize_days_of_week(self.days_of_week)
        invalid_days = [
            day for day in self.days_of_week if day not in WEEKDAY_VALUES
        ]
        if invalid_days:
            raise ValidationError(
                {
                    "days_of_week": (
                        "Invalid days of week: " + ", ".join(sorted(invalid_days))
                    )
                }
            )

        if self.schedule_type == self.ScheduleType.FIXED:
            if not self.time_of_day:
                raise ValidationError({"time_of_day": "Time of day is required."})
            self.interval_hours = None
            self.anchor_time = None
            return

        if self.schedule_type == self.ScheduleType.INTERVAL:
            if not self.interval_hours:
                raise ValidationError(
                    {"interval_hours": "Interval hours are required."}
                )
            if self.interval_hours < 1 or self.interval_hours > 24:
                raise ValidationError(
                    {"interval_hours": "Interval hours must be between 1 and 24."}
                )
            if not self.anchor_time:
                raise ValidationError({"anchor_time": "Anchor time is required."})
            self.time_of_day = None
            self.days_of_week = []
            return

        raise ValidationError({"schedule_type": "Unsupported schedule type."})

    def save(self, *args, **kwargs):
        self.full_clean()
        super().save(*args, **kwargs)


class MedicationLog(models.Model):
    class Status(models.TextChoices):
        TAKEN = "taken", "Taken"
        SKIPPED = "skipped", "Skipped"
        REFUSED = "refused", "Refused"

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    medication = models.ForeignKey(
        Medication,
        on_delete=models.CASCADE,
        related_name="logs",
    )
    scheduled_for = models.DateTimeField()
    status = models.CharField(max_length=20, choices=Status.choices)
    logged_at = models.DateTimeField(auto_now=True)
    medication_name_snapshot = models.CharField(max_length=200)
    dose_snapshot = models.CharField(max_length=120)

    class Meta:
        ordering = ["-scheduled_for"]
        constraints = [
            models.UniqueConstraint(
                fields=["medication", "scheduled_for"],
                name="unique_medication_scheduled_log",
            )
        ]
        indexes = [
            models.Index(fields=["medication", "scheduled_for"]),
        ]

    def __str__(self):
        return (
            f"{self.medication_name_snapshot} {self.status} at "
            f"{self.scheduled_for.isoformat()}"
        )
