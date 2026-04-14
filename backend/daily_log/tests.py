from datetime import timedelta

from django.contrib.auth import get_user_model
from django.core.management import call_command
from django.test import TestCase
from django.utils import timezone
from rest_framework import status
from rest_framework.test import APIClient

from daily_log.models import LogEntry
from knowledgebase.models import Behavior, BehaviorCategory

User = get_user_model()


class DailyLogApiTests(TestCase):
    @classmethod
    def setUpTestData(cls):
        call_command("import_knowledgebase")
        cls.user = User.objects.create_user(
            username="caregiver",
            email="caregiver@example.com",
            password="TestPass123!",
            email_verified=True,
        )
        cls.other_user = User.objects.create_user(
            username="other-caregiver",
            email="other@example.com",
            password="TestPass123!",
            email_verified=True,
        )
        cls.behavior = Behavior.objects.get(slug="repeating-the-same-question")
        category = BehaviorCategory.objects.get(slug="repetition")
        cls.unpublished_behavior = Behavior.objects.create(
            category=category,
            title="Hidden Behavior",
            slug="hidden-behavior",
            tags=["hidden"],
            whats_happening="Hidden behavior",
            what_not_to_do=["Do not escalate."],
            what_to_say=["Stay calm."],
            why_it_works="It keeps stress low.",
            common_triggers=["Stress"],
            bonus_tips=["Keep voice low"],
            is_published=False,
        )

    def setUp(self):
        self.client = APIClient()

    def authenticate(self, user=None):
        self.client.force_authenticate(user=user or self.user)

    def create_entry(self, *, user=None, moods=None, note="", linked_behavior=None):
        entry = LogEntry.objects.create(
            user=user or self.user,
            moods=moods or [LogEntry.Mood.CALM],
            note=note,
            linked_behavior=linked_behavior,
        )
        return entry

    def test_create_entry_with_one_mood(self):
        self.authenticate()

        response = self.client.post(
            "/api/log/entries/",
            {"moods": ["calm"], "note": "Quiet morning."},
            format="json",
        )

        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertEqual(response.data["moods"], ["calm"])
        self.assertEqual(response.data["note"], "Quiet morning.")

    def test_create_entry_with_multiple_moods_and_linked_behavior(self):
        self.authenticate()

        response = self.client.post(
            "/api/log/entries/",
            {
                "moods": ["confused", "anxious"],
                "note": "Needed reassurance at lunch.",
                "linked_behavior_id": str(self.behavior.id),
            },
            format="json",
        )

        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertEqual(response.data["moods"], ["confused", "anxious"])
        self.assertEqual(response.data["linked_behavior"]["slug"], "repeating-the-same-question")

    def test_invalid_mood_is_rejected(self):
        self.authenticate()

        response = self.client.post(
            "/api/log/entries/",
            {"moods": ["calm", "panicked"]},
            format="json",
        )

        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn("moods", response.data)

    def test_duplicate_moods_are_normalized(self):
        self.authenticate()

        response = self.client.post(
            "/api/log/entries/",
            {"moods": ["agitated", "agitated", "confused", "agitated"]},
            format="json",
        )

        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertEqual(response.data["moods"], ["agitated", "confused"])

    def test_unpublished_behavior_cannot_be_linked(self):
        self.authenticate()

        response = self.client.post(
            "/api/log/entries/",
            {
                "moods": ["calm"],
                "linked_behavior_id": str(self.unpublished_behavior.id),
            },
            format="json",
        )

        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn("linked_behavior_id", response.data)

    def test_note_length_validation(self):
        self.authenticate()

        response = self.client.post(
            "/api/log/entries/",
            {"moods": ["calm"], "note": "a" * 301},
            format="json",
        )

        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn("note", response.data)

    def test_edit_existing_entry(self):
        self.authenticate()
        entry = self.create_entry(note="Before")

        response = self.client.patch(
            f"/api/log/entries/{entry.id}/",
            {
                "moods": ["happy", "calm"],
                "note": "After  ",
                "linked_behavior_id": str(self.behavior.id),
            },
            format="json",
        )

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data["moods"], ["happy", "calm"])
        self.assertEqual(response.data["note"], "After")
        self.assertEqual(response.data["linked_behavior"]["slug"], "repeating-the-same-question")

    def test_delete_existing_entry(self):
        self.authenticate()
        entry = self.create_entry()

        response = self.client.delete(f"/api/log/entries/{entry.id}/")

        self.assertEqual(response.status_code, status.HTTP_204_NO_CONTENT)
        self.assertFalse(LogEntry.objects.filter(id=entry.id).exists())

    def test_user_isolation_on_detail_update_and_delete(self):
        entry = self.create_entry(user=self.other_user, note="Private note")
        self.authenticate()

        get_response = self.client.get(f"/api/log/entries/{entry.id}/")
        patch_response = self.client.patch(
            f"/api/log/entries/{entry.id}/",
            {"note": "nope"},
            format="json",
        )
        delete_response = self.client.delete(f"/api/log/entries/{entry.id}/")

        self.assertEqual(get_response.status_code, status.HTTP_404_NOT_FOUND)
        self.assertEqual(patch_response.status_code, status.HTTP_404_NOT_FOUND)
        self.assertEqual(delete_response.status_code, status.HTTP_404_NOT_FOUND)

    def test_list_is_paginated_and_newest_first(self):
        self.authenticate()
        now = timezone.now()
        created_entries = []
        for index in range(21):
            entry = self.create_entry(note=f"Entry {index}")
            created_entries.append(entry)
            LogEntry.objects.filter(id=entry.id).update(
                created_at=now - timedelta(minutes=index),
            )

        response = self.client.get("/api/log/entries/")

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data["count"], 21)
        self.assertEqual(len(response.data["results"]), 20)
        self.assertIsNotNone(response.data["next"])
        self.assertEqual(response.data["results"][0]["note"], "Entry 0")

        second_page = self.client.get("/api/log/entries/?page=2")
        self.assertEqual(second_page.status_code, status.HTTP_200_OK)
        self.assertEqual(len(second_page.data["results"]), 1)

    def test_summary_returns_last_seven_days_only(self):
        self.authenticate()
        now = timezone.now()

        recent_one = self.create_entry(
            moods=["calm", "confused"],
            linked_behavior=self.behavior,
        )
        recent_two = self.create_entry(moods=["agitated"])
        old_entry = self.create_entry(moods=["aggressive"], linked_behavior=self.behavior)

        LogEntry.objects.filter(id=recent_one.id).update(created_at=now - timedelta(days=1))
        LogEntry.objects.filter(id=recent_two.id).update(created_at=now - timedelta(days=3))
        LogEntry.objects.filter(id=old_entry.id).update(created_at=now - timedelta(days=8))

        response = self.client.get("/api/log/summary/?range=week")

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data["range"], "week")
        self.assertEqual(response.data["entry_count"], 2)
        self.assertEqual(response.data["linked_behavior_count"], 1)

        mood_counts = {item["mood"]: item["count"] for item in response.data["mood_counts"]}
        self.assertEqual(mood_counts["calm"], 1)
        self.assertEqual(mood_counts["confused"], 1)
        self.assertEqual(mood_counts["agitated"], 1)
        self.assertEqual(mood_counts["aggressive"], 0)

    def test_summary_rejects_invalid_range(self):
        self.authenticate()

        response = self.client.get("/api/log/summary/?range=month")

        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn("range", response.data)

    def test_anonymous_access_rejected(self):
        entry = self.create_entry()
        endpoints = [
            ("/api/log/entries/", "get"),
            ("/api/log/entries/", "post"),
            (f"/api/log/entries/{entry.id}/", "get"),
            (f"/api/log/entries/{entry.id}/", "patch"),
            (f"/api/log/entries/{entry.id}/", "delete"),
            ("/api/log/summary/?range=week", "get"),
        ]

        for path, method in endpoints:
            if method == "post":
                response = self.client.post(
                    path,
                    {"moods": ["calm"]},
                    format="json",
                )
            elif method == "patch":
                response = self.client.patch(
                    path,
                    {"note": "x"},
                    format="json",
                )
            else:
                response = getattr(self.client, method)(path)
            self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)
