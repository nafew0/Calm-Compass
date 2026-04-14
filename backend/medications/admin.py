from django.contrib import admin

from .models import Medication, MedicationLog, MedicationSchedule
from .services import build_schedule_summary


class MedicationScheduleInline(admin.TabularInline):
    model = MedicationSchedule
    extra = 0


@admin.register(Medication)
class MedicationAdmin(admin.ModelAdmin):
    list_display = [
        "name",
        "dose",
        "user",
        "is_active",
        "schedule_type",
        "schedule_summary",
        "updated_at",
    ]
    list_filter = ["is_active", "schedules__schedule_type", "updated_at"]
    search_fields = ["name", "dose", "user__username", "user__email"]
    autocomplete_fields = ["user"]
    inlines = [MedicationScheduleInline]
    readonly_fields = ["created_at", "updated_at"]

    def get_queryset(self, request):
        return super().get_queryset(request).prefetch_related("schedules")

    def schedule_type(self, obj):
        first_schedule = obj.schedules.all().first()
        return first_schedule.schedule_type if first_schedule else "—"

    def schedule_summary(self, obj):
        return build_schedule_summary(obj.schedules.all()) or "—"


@admin.register(MedicationSchedule)
class MedicationScheduleAdmin(admin.ModelAdmin):
    list_display = [
        "medication",
        "schedule_type",
        "time_of_day",
        "interval_hours",
        "anchor_time",
    ]
    list_filter = ["schedule_type", "created_at"]
    search_fields = ["medication__name", "medication__user__username"]
    autocomplete_fields = ["medication"]


@admin.register(MedicationLog)
class MedicationLogAdmin(admin.ModelAdmin):
    list_display = [
        "medication_name_snapshot",
        "dose_snapshot",
        "status",
        "scheduled_for",
        "logged_at",
    ]
    list_filter = ["status", "scheduled_for", "logged_at"]
    search_fields = [
        "medication_name_snapshot",
        "dose_snapshot",
        "medication__user__username",
        "medication__user__email",
    ]
    autocomplete_fields = ["medication"]
    readonly_fields = ["logged_at"]
