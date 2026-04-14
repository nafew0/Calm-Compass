from django.contrib import admin
from django.db.models import TextField
from django.db.models.functions import Cast

from .models import LogEntry


class MoodFilter(admin.SimpleListFilter):
    title = "mood"
    parameter_name = "mood"

    def lookups(self, request, model_admin):
        return list(LogEntry.Mood.choices)

    def queryset(self, request, queryset):
        if not self.value():
            return queryset
        return queryset.annotate(
            moods_text=Cast("moods", output_field=TextField())
        ).filter(moods_text__icontains=f'"{self.value()}"')


@admin.register(LogEntry)
class LogEntryAdmin(admin.ModelAdmin):
    list_display = [
        "user",
        "mood_list",
        "linked_behavior",
        "short_note",
        "created_at",
    ]
    list_filter = [MoodFilter, "linked_behavior", "created_at"]
    search_fields = ["note", "user__username", "user__email"]
    autocomplete_fields = ["user", "linked_behavior"]
    readonly_fields = ["created_at", "updated_at"]

    def mood_list(self, obj):
        return ", ".join(LogEntry.mood_label_map().get(mood, mood) for mood in obj.moods)

    def short_note(self, obj):
        if not obj.note:
            return "—"
        return obj.note[:60] + ("..." if len(obj.note) > 60 else "")

