from django.contrib import admin

from .models import AIChatUsage


@admin.register(AIChatUsage)
class AIChatUsageAdmin(admin.ModelAdmin):
    list_display = ["user", "used_queries", "last_used_at", "updated_at"]
    list_filter = ["last_used_at", "updated_at"]
    search_fields = ["user__username", "user__email"]
    autocomplete_fields = ["user"]
    readonly_fields = ["created_at", "updated_at"]
