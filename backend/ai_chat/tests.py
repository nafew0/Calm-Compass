from datetime import timedelta
from unittest.mock import patch

from django.contrib.auth import get_user_model
from django.test import TestCase
from django.utils import timezone
from rest_framework import status
from rest_framework.test import APIClient

from accounts.models import SiteSettings
from ai_chat.models import AIChatUsage
from ai_chat.services import AIChatService, SYSTEM_PROMPT
from daily_log.models import LogEntry
from knowledgebase.models import Behavior, BehaviorCategory

User = get_user_model()


class AIChatApiTests(TestCase):
    @classmethod
    def setUpTestData(cls):
        cls.user = User.objects.create_user(
            username="caregiver",
            email="caregiver@example.com",
            password="TestPass123!",
            email_verified=True,
            care_recipient_name="Mom",
            timezone="America/New_York",
        )
        cls.category = BehaviorCategory.objects.create(
            name="Repetition",
            slug="repetition",
            icon="repeat",
            display_order=1,
        )
        cls.behavior = Behavior.objects.create(
            category=cls.category,
            title="Repeating the Same Question",
            slug="repeating-the-same-question",
            tags=["repetition"],
            whats_happening="Short-term memory changes make the answer feel new each time.",
            what_not_to_do=["Do not argue."],
            what_to_say=["Let me answer that again."],
            why_it_works="It reduces pressure and avoids escalation.",
            common_triggers=["Fatigue"],
            bonus_tips=["Use a visual cue card."],
            is_published=True,
        )

    def setUp(self):
        self.client = APIClient()
        self.client.force_authenticate(user=self.user)
        SiteSettings.objects.update_or_create(
            pk=1,
            defaults={
                "require_email_verification": False,
                "logged_in_users_only_default": False,
                "ai_provider": SiteSettings.AIProvider.OPENAI,
                "ai_model_openai": "gpt-5-mini",
                "ai_model_anthropic": "",
                "ai_fallback_lifetime_cap": 3,
            },
        )

    def create_log_entry(self, *, minutes_ago, note, linked_behavior=None):
        entry = LogEntry.objects.create(
            user=self.user,
            moods=[LogEntry.Mood.CALM],
            note=note,
            linked_behavior=linked_behavior,
        )
        LogEntry.objects.filter(id=entry.id).update(
            created_at=timezone.now() - timedelta(minutes=minutes_ago)
        )
        entry.refresh_from_db()
        return entry

    @patch("ai_chat.services.get_ai_api_key", return_value="test-key")
    def test_status_endpoint_returns_remaining_count(self, mocked_get_ai_api_key):
        response = self.client.get("/api/ai/status/")

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertTrue(response.data["available"])
        self.assertEqual(response.data["remaining_queries"], 3)
        self.assertEqual(response.data["used_queries"], 0)
        self.assertEqual(response.data["lifetime_cap"], 3)
        self.assertEqual(response.data["provider"], "openai")
        self.assertEqual(response.data["model"], "gpt-5-mini")
        mocked_get_ai_api_key.assert_called_once()

    @patch.object(AIChatService, "_request_ai_response", return_value="What may be happening\nTest")
    @patch("ai_chat.services.get_ai_api_key", return_value="test-key")
    def test_ask_endpoint_returns_answer_and_increments_usage(
        self, mocked_get_ai_api_key, mocked_request_ai_response
    ):
        response = self.client.post(
            "/api/ai/ask/",
            {
                "behavior_slug": self.behavior.slug,
                "question": "The static advice did not help. What should I try now?",
            },
            format="json",
        )

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data["source"], "ai")
        self.assertEqual(response.data["remaining_queries"], 2)
        self.assertEqual(response.data["used_queries"], 1)
        self.assertEqual(AIChatUsage.objects.get(user=self.user).used_queries, 1)
        mocked_request_ai_response.assert_called_once()
        self.assertGreaterEqual(mocked_get_ai_api_key.call_count, 1)

    @patch.object(AIChatService, "_request_ai_response")
    @patch("ai_chat.services.get_ai_api_key", return_value="test-key")
    def test_exhausted_cap_returns_403_and_does_not_call_provider(
        self, mocked_get_ai_api_key, mocked_request_ai_response
    ):
        AIChatUsage.objects.create(user=self.user, used_queries=3)

        response = self.client.post(
            "/api/ai/ask/",
            {
                "behavior_slug": self.behavior.slug,
                "question": "What should I try now?",
            },
            format="json",
        )

        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)
        self.assertEqual(
            response.data["unavailable_reason"],
            "You have used all available AI fallback queries.",
        )
        mocked_request_ai_response.assert_not_called()
        self.assertEqual(AIChatUsage.objects.get(user=self.user).used_queries, 3)
        self.assertEqual(mocked_get_ai_api_key.call_count, 0)

    @patch("ai_chat.services.get_ai_api_key", return_value="test-key")
    def test_zero_cap_disables_feature(self, mocked_get_ai_api_key):
        SiteSettings.objects.filter(pk=1).update(ai_fallback_lifetime_cap=0)

        status_response = self.client.get("/api/ai/status/")
        ask_response = self.client.post(
            "/api/ai/ask/",
            {
                "behavior_slug": self.behavior.slug,
                "question": "What should I try now?",
            },
            format="json",
        )

        self.assertEqual(status_response.status_code, status.HTTP_200_OK)
        self.assertFalse(status_response.data["available"])
        self.assertEqual(
            status_response.data["unavailable_reason"],
            "AI fallback is disabled right now.",
        )
        self.assertEqual(ask_response.status_code, status.HTTP_403_FORBIDDEN)
        self.assertFalse(AIChatUsage.objects.filter(user=self.user).exists())
        self.assertEqual(mocked_get_ai_api_key.call_count, 0)

    @patch("ai_chat.services.get_ai_api_key", return_value="")
    def test_missing_provider_configuration_returns_unavailable_without_incrementing_usage(
        self, mocked_get_ai_api_key
    ):
        response = self.client.post(
            "/api/ai/ask/",
            {
                "behavior_slug": self.behavior.slug,
                "question": "What should I try now?",
            },
            format="json",
        )

        self.assertEqual(response.status_code, status.HTTP_503_SERVICE_UNAVAILABLE)
        self.assertEqual(
            response.data["unavailable_reason"],
            "The AI provider key is not configured on the server.",
        )
        self.assertFalse(AIChatUsage.objects.filter(user=self.user).exists())
        mocked_get_ai_api_key.assert_called_once()

    def test_prompt_builder_includes_behavior_question_and_latest_fifteen_log_entries(self):
        self.create_log_entry(minutes_ago=0, note="Entry 0", linked_behavior=self.behavior)
        for index in range(1, 16):
            self.create_log_entry(minutes_ago=index, note=f"Entry {index}")

        prompt = AIChatService.build_user_prompt(
            user=self.user,
            behavior=self.behavior,
            question="What should I say right now?",
        )

        self.assertIn("Care recipient\nMom", prompt)
        self.assertIn("Title: Repeating the Same Question", prompt)
        self.assertIn("What not to do:\n- Do not argue.", prompt)
        self.assertIn("Caregiver question\nWhat should I say right now?", prompt)
        self.assertIn("Entry 0", prompt)
        self.assertIn("Entry 14", prompt)
        self.assertNotIn("Entry 15", prompt)
        self.assertIn("Linked behavior: Repeating the Same Question (Repetition)", prompt)
        self.assertEqual(prompt.count("Moods: Calm"), 15)

    def test_system_prompt_requires_short_structured_answer(self):
        self.assertIn("TL;DR-style", SYSTEM_PROMPT)
        self.assertIn("70 to 140 words", SYSTEM_PROMPT)
        self.assertIn("Use exactly these headings and no others", SYSTEM_PROMPT)
        self.assertIn("Use flat bullets only", SYSTEM_PROMPT)

    @patch.object(AIChatService, "_request_ai_response")
    @patch("ai_chat.services.get_ai_api_key", return_value="test-key")
    def test_emergency_shortcut_returns_safety_fallback_without_consuming_query(
        self, mocked_get_ai_api_key, mocked_request_ai_response
    ):
        response = self.client.post(
            "/api/ai/ask/",
            {
                "behavior_slug": self.behavior.slug,
                "question": "He collapsed and is not breathing. What do I do?",
            },
            format="json",
        )

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data["source"], "safety_fallback")
        self.assertIn("What may be happening", response.data["answer"])
        self.assertIn("- **Call emergency services now**", response.data["answer"])
        self.assertFalse(AIChatUsage.objects.filter(user=self.user).exists())
        mocked_request_ai_response.assert_not_called()
        self.assertGreaterEqual(mocked_get_ai_api_key.call_count, 1)

    def test_anonymous_access_rejected(self):
        self.client.force_authenticate(user=None)

        status_response = self.client.get("/api/ai/status/")
        ask_response = self.client.post(
            "/api/ai/ask/",
            {
                "behavior_slug": self.behavior.slug,
                "question": "What should I try now?",
            },
            format="json",
        )

        self.assertEqual(status_response.status_code, status.HTTP_401_UNAUTHORIZED)
        self.assertEqual(ask_response.status_code, status.HTTP_401_UNAUTHORIZED)
