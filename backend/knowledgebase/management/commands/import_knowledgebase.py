import json
from pathlib import Path

from django.core.management.base import BaseCommand, CommandError
from django.db import transaction

from knowledgebase.models import Behavior, BehaviorCategory


class Command(BaseCommand):
    help = "Import CalmCompass categories and behaviors from the normalized JSON fixture."

    def add_arguments(self, parser):
        parser.add_argument(
            "--preserve-existing-content",
            action="store_true",
            help="Keep existing behavior content instead of overwriting it from the fixture.",
        )

    def handle(self, *args, **options):
        fixture_path = (
            Path(__file__).resolve().parents[2] / "data" / "behaviors.json"
        )
        if not fixture_path.exists():
            raise CommandError(f"Fixture not found: {fixture_path}")

        with fixture_path.open("r", encoding="utf-8") as fixture_file:
            payload = json.load(fixture_file)

        categories_payload = payload.get("categories", [])
        behaviors_payload = payload.get("behaviors", [])
        if not categories_payload or not behaviors_payload:
            raise CommandError("Fixture must include non-empty categories and behaviors arrays.")

        preserve_existing_content = options["preserve_existing_content"]

        with transaction.atomic():
            category_map = {}
            created_categories = 0
            updated_categories = 0
            created_behaviors = 0
            updated_behaviors = 0
            preserved_behaviors = 0

            for category_data in categories_payload:
                category, created = BehaviorCategory.objects.update_or_create(
                    slug=category_data["slug"],
                    defaults={
                        "name": category_data["name"],
                        "icon": category_data.get("icon", ""),
                        "display_order": category_data.get("display_order", 0),
                        "is_active": category_data.get("is_active", True),
                    },
                )
                category_map[category.slug] = category
                if created:
                    created_categories += 1
                else:
                    updated_categories += 1

            for behavior_data in behaviors_payload:
                category_slug = behavior_data["category_slug"]
                category = category_map.get(category_slug)
                if category is None:
                    raise CommandError(
                        f"Behavior '{behavior_data['title']}' references unknown category slug '{category_slug}'."
                    )

                existing_behavior = Behavior.objects.filter(slug=behavior_data["slug"]).first()
                if existing_behavior and preserve_existing_content:
                    preserved_behaviors += 1
                    continue

                _, created = Behavior.objects.update_or_create(
                    slug=behavior_data["slug"],
                    defaults={
                        "category": category,
                        "title": behavior_data["title"],
                        "tags": behavior_data.get("tags", []),
                        "whats_happening": behavior_data["whats_happening"],
                        "what_not_to_do": behavior_data["what_not_to_do"],
                        "what_to_say": behavior_data["what_to_say"],
                        "why_it_works": behavior_data["why_it_works"],
                        "common_triggers": behavior_data.get("common_triggers", []),
                        "bonus_tips": behavior_data.get("bonus_tips", []),
                        "dementia_stage": behavior_data.get(
                            "dementia_stage", Behavior.DementiaStage.ALL
                        ),
                        "is_published": behavior_data.get("is_published", True),
                    },
                )
                if created:
                    created_behaviors += 1
                else:
                    updated_behaviors += 1

        self.stdout.write(
            self.style.SUCCESS(
                "Imported knowledgebase fixture successfully "
                f"(categories: {created_categories} created, {updated_categories} updated; "
                f"behaviors: {created_behaviors} created, {updated_behaviors} updated, "
                f"{preserved_behaviors} preserved)."
            )
        )
