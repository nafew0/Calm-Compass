from rest_framework import serializers


class AIStatusSerializer(serializers.Serializer):
    available = serializers.BooleanField()
    remaining_queries = serializers.IntegerField()
    used_queries = serializers.IntegerField()
    lifetime_cap = serializers.IntegerField()
    provider = serializers.CharField(allow_blank=True)
    model = serializers.CharField(allow_blank=True)
    unavailable_reason = serializers.CharField(allow_null=True, allow_blank=True)


class AIAskRequestSerializer(serializers.Serializer):
    behavior_slug = serializers.SlugField(max_length=100)
    question = serializers.CharField(max_length=1200)

    def validate_question(self, value):
        normalized = (value or "").strip()
        if not normalized:
            raise serializers.ValidationError("Enter a follow-up question first.")
        return normalized


class AIAskResponseSerializer(AIStatusSerializer):
    answer = serializers.CharField()
    source = serializers.ChoiceField(choices=["ai", "safety_fallback"])
