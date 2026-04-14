from django.contrib.auth import get_user_model
from django.core.management import call_command
from django.test import TestCase
from rest_framework import status
from rest_framework.test import APIClient

from knowledgebase.models import Behavior, BehaviorCategory, DecoderState

User = get_user_model()


class KnowledgebaseImportTests(TestCase):
    @classmethod
    def setUpTestData(cls):
        call_command("import_knowledgebase")
        cls.user = User.objects.create_user(
            username="caregiver",
            email="caregiver@example.com",
            password="TestPass123!",
            email_verified=True,
        )

    def setUp(self):
        self.client = APIClient()

    def authenticate(self):
        self.client.force_authenticate(user=self.user)

    def test_import_command_loads_all_categories_and_behaviors(self):
        self.assertEqual(BehaviorCategory.objects.count(), 10)
        self.assertEqual(Behavior.objects.count(), 50)

    def test_import_command_is_idempotent(self):
        call_command("import_knowledgebase")
        self.assertEqual(BehaviorCategory.objects.count(), 10)
        self.assertEqual(Behavior.objects.count(), 50)

    def test_behavior_slugs_are_unique(self):
        slugs = list(Behavior.objects.values_list("slug", flat=True))
        self.assertEqual(len(slugs), len(set(slugs)))

    def test_imported_behaviors_have_required_decoder_fields(self):
        for behavior in Behavior.objects.filter(is_published=True):
            self.assertTrue(behavior.title)
            self.assertTrue(behavior.whats_happening)
            self.assertTrue(behavior.what_not_to_do)
            self.assertTrue(behavior.what_to_say)
            self.assertTrue(behavior.why_it_works)
            self.assertTrue(behavior.common_triggers)

    def test_decoder_endpoints_require_authentication(self):
        endpoints = [
            ("/api/kb/categories/", "get"),
            ("/api/kb/categories/repetition/", "get"),
            ("/api/kb/behaviors/?search=question", "get"),
            ("/api/kb/behaviors/repeating-the-same-question/", "get"),
            ("/api/kb/me/last-viewed/", "get"),
            ("/api/kb/behaviors/repeating-the-same-question/view/", "post"),
        ]

        for path, method in endpoints:
            response = getattr(self.client, method)(path)
            self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)

    def test_category_list_returns_counts_for_authenticated_user(self):
        self.authenticate()

        response = self.client.get("/api/kb/categories/")

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(len(response.data), 10)
        self.assertEqual(sum(item["behavior_count"] for item in response.data), 50)

    def test_category_detail_returns_category_and_behavior_summaries(self):
        self.authenticate()

        response = self.client.get("/api/kb/categories/repetition/")

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data["slug"], "repetition")
        self.assertEqual(response.data["behavior_count"], 4)
        self.assertEqual(len(response.data["behaviors"]), 4)
        self.assertIn("short_summary", response.data["behaviors"][0])

    def test_behavior_list_search_matches_title_and_search_text(self):
        self.authenticate()

        title_response = self.client.get("/api/kb/behaviors/?search=shower")
        self.assertEqual(title_response.status_code, status.HTTP_200_OK)
        self.assertIsInstance(title_response.data, list)
        self.assertIn(
            "Refusing to Bathe or Shower",
            [item["title"] for item in title_response.data],
        )

        content_response = self.client.get("/api/kb/behaviors/?search=fight-or-flight")
        self.assertEqual(content_response.status_code, status.HTTP_200_OK)
        self.assertIsInstance(content_response.data, list)
        self.assertTrue(
            any(title.startswith("Physical Aggression") for title in [item["title"] for item in content_response.data])
        )

    def test_behavior_detail_returns_full_payload(self):
        self.authenticate()

        response = self.client.get("/api/kb/behaviors/repeating-the-same-question/")

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data["title"], "Repeating the Same Question")
        self.assertIn("common_triggers", response.data)
        self.assertIn("bonus_tips", response.data)
        self.assertTrue(response.data["what_not_to_do"])

    def test_last_viewed_state_returns_empty_payload_before_any_lookup(self):
        self.authenticate()

        response = self.client.get("/api/kb/me/last-viewed/")

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data, {"behavior": None, "viewed_at": None})

    def test_posting_behavior_view_creates_decoder_state_and_returns_payload(self):
        self.authenticate()

        response = self.client.post("/api/kb/behaviors/repeating-the-same-question/view/")

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data["behavior"]["slug"], "repeating-the-same-question")
        self.assertIsNotNone(response.data["viewed_at"])

        state = DecoderState.objects.get(user=self.user)
        self.assertEqual(state.last_viewed_behavior.slug, "repeating-the-same-question")

    def test_last_viewed_state_returns_saved_behavior_for_user(self):
        self.authenticate()

        self.client.post("/api/kb/behaviors/repeating-the-same-question/view/")
        response = self.client.get("/api/kb/me/last-viewed/")

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data["behavior"]["title"], "Repeating the Same Question")
        self.assertEqual(response.data["behavior"]["category"]["slug"], "repetition")
