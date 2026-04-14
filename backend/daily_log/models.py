import uuid

from django.conf import settings
from django.core.exceptions import ValidationError
from django.db import models

from knowledgebase.models import Behavior


class LogEntry(models.Model):
    class Mood(models.TextChoices):
        CALM = "calm", "Calm"
        CONFUSED = "confused", "Confused"
        AGITATED = "agitated", "Agitated"
        HAPPY = "happy", "Happy"
        ANXIOUS = "anxious", "Anxious"
        AGGRESSIVE = "aggressive", "Aggressive"

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="daily_log_entries",
    )
    moods = models.JSONField(default=list)
    linked_behavior = models.ForeignKey(
        Behavior,
        on_delete=models.SET_NULL,
        related_name="log_entries",
        null=True,
        blank=True,
    )
    note = models.CharField(max_length=300, blank=True, default="")
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ["-created_at"]
        indexes = [
            models.Index(fields=["user", "created_at"]),
        ]

    def __str__(self):
        return f"Log entry for {self.user} at {self.created_at}"

    @classmethod
    def ordered_moods(cls):
        return [choice.value for choice in cls.Mood]

    @classmethod
    def mood_label_map(cls):
        return {choice.value: choice.label for choice in cls.Mood}

    @classmethod
    def normalize_moods(cls, moods):
        normalized = []
        seen = set()
        for mood in moods or []:
            value = str(mood).strip().lower()
            if value and value not in seen:
                normalized.append(value)
                seen.add(value)
        return normalized

    def clean(self):
        normalized_moods = self.normalize_moods(self.moods)
        if not normalized_moods:
            raise ValidationError({"moods": "Select at least one mood."})

        allowed_moods = set(self.ordered_moods())
        invalid_moods = [mood for mood in normalized_moods if mood not in allowed_moods]
        if invalid_moods:
            raise ValidationError(
                {
                    "moods": (
                        "Invalid mood selection: "
                        + ", ".join(sorted(invalid_moods))
                    )
                }
            )

        self.moods = normalized_moods
        self.note = (self.note or "").strip()

        if self.linked_behavior and (
            not self.linked_behavior.is_published
            or not self.linked_behavior.category.is_active
        ):
            raise ValidationError(
                {"linked_behavior": "Linked behavior must be published and active."}
            )

    def save(self, *args, **kwargs):
        self.full_clean()
        super().save(*args, **kwargs)

