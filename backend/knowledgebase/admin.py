from django.contrib import admin

from .models import Behavior, BehaviorCategory, DecoderState


@admin.register(BehaviorCategory)
class BehaviorCategoryAdmin(admin.ModelAdmin):
    list_display = ["display_order", "name", "slug", "icon", "is_active"]
    list_filter = ["is_active"]
    search_fields = ["name", "slug", "icon"]
    ordering = ["display_order", "name"]
    prepopulated_fields = {"slug": ("name",)}


@admin.register(Behavior)
class BehaviorAdmin(admin.ModelAdmin):
    list_display = [
        "title",
        "category",
        "dementia_stage",
        "is_published",
        "updated_at",
    ]
    list_filter = ["category", "dementia_stage", "is_published"]
    search_fields = ["title", "slug", "search_text"]
    autocomplete_fields = ["category"]
    ordering = ["category__display_order", "title"]
    prepopulated_fields = {"slug": ("title",)}
    readonly_fields = ["search_text", "created_at", "updated_at"]

    fieldsets = (
        (
            None,
            {
                "fields": (
                    "category",
                    "title",
                    "slug",
                    "tags",
                    "dementia_stage",
                    "is_published",
                )
            },
        ),
        (
            "Decoder content",
            {
                "fields": (
                    "whats_happening",
                    "what_not_to_do",
                    "what_to_say",
                    "why_it_works",
                    "common_triggers",
                    "bonus_tips",
                )
            },
        ),
        ("Metadata", {"fields": ("search_text", "created_at", "updated_at")}),
    )


@admin.register(DecoderState)
class DecoderStateAdmin(admin.ModelAdmin):
    list_display = ["user", "last_viewed_behavior", "last_viewed_at", "updated_at"]
    search_fields = ["user__username", "user__email", "last_viewed_behavior__title"]
    autocomplete_fields = ["user", "last_viewed_behavior"]
    readonly_fields = ["created_at", "updated_at"]
