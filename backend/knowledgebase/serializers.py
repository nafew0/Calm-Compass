from rest_framework import serializers

from .models import Behavior, BehaviorCategory, DecoderState


class BehaviorCategorySerializer(serializers.ModelSerializer):
    behavior_count = serializers.IntegerField(read_only=True)

    class Meta:
        model = BehaviorCategory
        fields = ["id", "name", "slug", "icon", "display_order", "behavior_count"]


class BehaviorCategorySummarySerializer(serializers.ModelSerializer):
    class Meta:
        model = BehaviorCategory
        fields = ["name", "slug", "icon"]


class BehaviorListSerializer(serializers.ModelSerializer):
    category = BehaviorCategorySummarySerializer(read_only=True)
    short_summary = serializers.ReadOnlyField()

    class Meta:
        model = Behavior
        fields = ["id", "title", "slug", "category", "tags", "short_summary"]


class BehaviorCategoryBehaviorSerializer(serializers.ModelSerializer):
    short_summary = serializers.ReadOnlyField()

    class Meta:
        model = Behavior
        fields = ["id", "title", "slug", "tags", "short_summary"]


class BehaviorDetailSerializer(serializers.ModelSerializer):
    category = BehaviorCategorySummarySerializer(read_only=True)
    short_summary = serializers.ReadOnlyField()

    class Meta:
        model = Behavior
        fields = [
            "id",
            "title",
            "slug",
            "category",
            "tags",
            "short_summary",
            "whats_happening",
            "what_not_to_do",
            "what_to_say",
            "why_it_works",
            "common_triggers",
            "bonus_tips",
            "dementia_stage",
        ]


class BehaviorCategoryDetailSerializer(BehaviorCategorySerializer):
    behaviors = BehaviorCategoryBehaviorSerializer(
        source="published_behaviors",
        many=True,
        read_only=True,
    )

    class Meta(BehaviorCategorySerializer.Meta):
        fields = BehaviorCategorySerializer.Meta.fields + ["behaviors"]


class LastViewedBehaviorSerializer(serializers.ModelSerializer):
    category = BehaviorCategorySummarySerializer(read_only=True)
    short_summary = serializers.ReadOnlyField()

    class Meta:
        model = Behavior
        fields = ["title", "slug", "short_summary", "category"]


class DecoderStateSerializer(serializers.ModelSerializer):
    behavior = serializers.SerializerMethodField()
    viewed_at = serializers.DateTimeField(source="last_viewed_at", read_only=True)

    class Meta:
        model = DecoderState
        fields = ["behavior", "viewed_at"]

    def get_behavior(self, obj):
        if not obj.last_viewed_behavior:
            return None
        return LastViewedBehaviorSerializer(obj.last_viewed_behavior).data
