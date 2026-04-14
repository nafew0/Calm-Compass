import uuid

from django.conf import settings
from django.db import models
from django.utils.text import Truncator


class BehaviorCategory(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    name = models.CharField(max_length=150, unique=True)
    slug = models.SlugField(unique=True)
    icon = models.CharField(max_length=80, blank=True, default="")
    display_order = models.PositiveSmallIntegerField(default=0)
    is_active = models.BooleanField(default=True)

    class Meta:
        ordering = ["display_order", "name"]
        verbose_name_plural = "Behavior categories"

    def __str__(self):
        return self.name


class Behavior(models.Model):
    class DementiaStage(models.TextChoices):
        ALL = "all", "All"
        EARLY = "early", "Early"
        MIDDLE = "middle", "Middle"
        LATE = "late", "Late"

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    category = models.ForeignKey(
        BehaviorCategory,
        on_delete=models.PROTECT,
        related_name="behaviors",
    )
    title = models.CharField(max_length=255)
    slug = models.SlugField(unique=True)
    tags = models.JSONField(default=list, blank=True)
    whats_happening = models.TextField()
    what_not_to_do = models.JSONField(default=list, blank=True)
    what_to_say = models.JSONField(default=list, blank=True)
    why_it_works = models.TextField()
    common_triggers = models.JSONField(default=list, blank=True)
    bonus_tips = models.JSONField(default=list, blank=True)
    dementia_stage = models.CharField(
        max_length=20,
        choices=DementiaStage.choices,
        default=DementiaStage.ALL,
    )
    is_published = models.BooleanField(default=True)
    search_text = models.TextField(blank=True, default="", editable=False)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ["title"]
        indexes = [
            models.Index(fields=["slug"]),
            models.Index(fields=["is_published"]),
            models.Index(fields=["dementia_stage"]),
        ]

    def __str__(self):
        return self.title

    @property
    def short_summary(self):
        return Truncator(self.whats_happening).chars(180)

    def save(self, *args, **kwargs):
        normalized_tags = [str(tag).strip() for tag in (self.tags or []) if str(tag).strip()]
        self.tags = list(dict.fromkeys(normalized_tags))
        self.search_text = " ".join(
            [
                self.title,
                " ".join(self.tags),
                self.whats_happening,
                " ".join(self.common_triggers or []),
                " ".join(self.bonus_tips or []),
            ]
        ).strip()
        super().save(*args, **kwargs)


class DecoderState(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    user = models.OneToOneField(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="decoder_state",
    )
    last_viewed_behavior = models.ForeignKey(
        Behavior,
        on_delete=models.SET_NULL,
        related_name="last_viewed_states",
        null=True,
        blank=True,
    )
    last_viewed_at = models.DateTimeField(null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ["-updated_at"]

    def __str__(self):
        return f"Decoder state for {self.user}"
