import json
from pathlib import Path

from django.db import migrations


def _build_search_text(title, tags, whats_happening, common_triggers, bonus_tips):
    return " ".join(
        [
            title,
            " ".join(tags or []),
            whats_happening or "",
            " ".join(common_triggers or []),
            " ".join(bonus_tips or []),
        ]
    ).strip()


def seed_behaviors(apps, schema_editor):
    BehaviorCategory = apps.get_model("knowledgebase", "BehaviorCategory")
    Behavior = apps.get_model("knowledgebase", "Behavior")

    fixture_path = (
        Path(__file__).resolve().parents[1] / "data" / "behaviors.json"
    )
    if not fixture_path.exists():
        return

    with fixture_path.open("r", encoding="utf-8") as fixture_file:
        payload = json.load(fixture_file)

    category_map = {}
    for category_data in payload.get("categories", []):
        category, _ = BehaviorCategory.objects.update_or_create(
            slug=category_data["slug"],
            defaults={
                "name": category_data["name"],
                "icon": category_data.get("icon", ""),
                "display_order": category_data.get("display_order", 0),
                "is_active": category_data.get("is_active", True),
            },
        )
        category_map[category.slug] = category

    for behavior_data in payload.get("behaviors", []):
        category = category_map.get(behavior_data["category_slug"])
        if category is None:
            continue

        normalized_tags = [
            str(tag).strip()
            for tag in behavior_data.get("tags", [])
            if str(tag).strip()
        ]
        normalized_tags = list(dict.fromkeys(normalized_tags))

        Behavior.objects.update_or_create(
            slug=behavior_data["slug"],
            defaults={
                "category": category,
                "title": behavior_data["title"],
                "tags": normalized_tags,
                "whats_happening": behavior_data["whats_happening"],
                "what_not_to_do": behavior_data["what_not_to_do"],
                "what_to_say": behavior_data["what_to_say"],
                "why_it_works": behavior_data["why_it_works"],
                "common_triggers": behavior_data.get("common_triggers", []),
                "bonus_tips": behavior_data.get("bonus_tips", []),
                "dementia_stage": behavior_data.get("dementia_stage", "all"),
                "is_published": behavior_data.get("is_published", True),
                "search_text": _build_search_text(
                    behavior_data["title"],
                    normalized_tags,
                    behavior_data["whats_happening"],
                    behavior_data.get("common_triggers", []),
                    behavior_data.get("bonus_tips", []),
                ),
            },
        )


def noop_reverse(apps, schema_editor):
    pass


class Migration(migrations.Migration):

    dependencies = [
        ("knowledgebase", "0003_slug_max_length"),
    ]

    operations = [
        migrations.RunPython(seed_behaviors, noop_reverse),
    ]
