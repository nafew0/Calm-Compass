from rest_framework import serializers

from knowledgebase.models import Behavior
from knowledgebase.serializers import BehaviorCategorySummarySerializer

from .models import LogEntry


class LinkedBehaviorSerializer(serializers.ModelSerializer):
    category = BehaviorCategorySummarySerializer(read_only=True)

    class Meta:
        model = Behavior
        fields = ["id", "title", "slug", "category"]


class LogEntrySerializer(serializers.ModelSerializer):
    linked_behavior = LinkedBehaviorSerializer(read_only=True)
    linked_behavior_id = serializers.PrimaryKeyRelatedField(
        queryset=Behavior.objects.select_related("category").filter(
            is_published=True,
            category__is_active=True,
        ),
        source="linked_behavior",
        write_only=True,
        allow_null=True,
        required=False,
    )
    mood_details = serializers.SerializerMethodField()

    class Meta:
        model = LogEntry
        fields = [
            "id",
            "moods",
            "mood_details",
            "note",
            "linked_behavior",
            "linked_behavior_id",
            "created_at",
            "updated_at",
        ]
        read_only_fields = ["id", "created_at", "updated_at", "linked_behavior", "mood_details"]

    def validate_moods(self, value):
        normalized_moods = LogEntry.normalize_moods(value)
        if not normalized_moods:
            raise serializers.ValidationError("Select at least one mood.")

        allowed_moods = set(LogEntry.ordered_moods())
        invalid_moods = [mood for mood in normalized_moods if mood not in allowed_moods]
        if invalid_moods:
            raise serializers.ValidationError(
                "Invalid mood selection: " + ", ".join(sorted(invalid_moods))
            )
        return normalized_moods

    def validate_note(self, value):
        return (value or "").strip()

    def get_mood_details(self, obj):
        labels = LogEntry.mood_label_map()
        return [
            {"mood": mood, "label": labels.get(mood, mood)}
            for mood in obj.moods
        ]

