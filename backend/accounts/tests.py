from django.contrib.auth import get_user_model
from django.test import TestCase
from django.test.utils import override_settings
from rest_framework import status
from rest_framework.test import APIClient

from accounts.models import SiteSettings

User = get_user_model()

TEST_CACHES = {
    "default": {
        "BACKEND": "django.core.cache.backends.locmem.LocMemCache",
        "LOCATION": "accounts-tests",
    }
}


@override_settings(CACHES=TEST_CACHES)
class AccountsApiTests(TestCase):
    def setUp(self):
        self.client = APIClient()
        SiteSettings.objects.update_or_create(
            pk=1,
            defaults={
                "require_email_verification": False,
                "logged_in_users_only_default": False,
            },
        )

    def test_user_registration_success_includes_setup_fields(self):
        response = self.client.post(
            "/api/auth/register/",
            {
                "username": "testuser",
                "email": "test@example.com",
                "password": "TestPass123!",
                "password2": "TestPass123!",
                "first_name": "",
                "last_name": "",
            },
        )

        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertIn("access_token", response.data)
        self.assertIn("user", response.data)
        self.assertEqual(response.data["user"]["care_recipient_name"], "")
        self.assertEqual(response.data["user"]["timezone"], "")
        self.assertFalse(response.data["user"]["has_completed_setup"])

    def test_user_registration_password_mismatch(self):
        response = self.client.post(
            "/api/auth/register/",
            {
                "username": "testuser",
                "email": "test@example.com",
                "password": "TestPass123!",
                "password2": "DifferentPass123!",
            },
        )

        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)

    def test_user_login_success_returns_access_token_and_user(self):
        user = User.objects.create_user(
            username="testuser",
            email="test@example.com",
            password="TestPass123!",
            email_verified=True,
        )

        response = self.client.post(
            "/api/auth/login/",
            {
                "username": user.username,
                "password": "TestPass123!",
            },
        )

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertIn("access_token", response.data)
        self.assertIn("user", response.data)
        self.assertEqual(response.data["user"]["username"], "testuser")

    def test_user_login_invalid_credentials(self):
        User.objects.create_user(
            username="testuser",
            email="test@example.com",
            password="TestPass123!",
            email_verified=True,
        )

        response = self.client.post(
            "/api/auth/login/",
            {
                "username": "testuser",
                "password": "WrongPassword",
            },
        )

        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)

    def test_get_user_includes_setup_fields(self):
        user = User.objects.create_user(
            username="setupuser",
            email="setup@example.com",
            password="TestPass123!",
            first_name="Mira",
            care_recipient_name="Dad",
            timezone="America/New_York",
            email_verified=True,
        )
        self.client.force_authenticate(user=user)

        response = self.client.get("/api/auth/user/")

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data["care_recipient_name"], "Dad")
        self.assertEqual(response.data["timezone"], "America/New_York")
        self.assertTrue(response.data["has_completed_setup"])

    def test_profile_update_can_complete_setup(self):
        user = User.objects.create_user(
            username="carer",
            email="carer@example.com",
            password="TestPass123!",
            email_verified=True,
        )
        self.client.force_authenticate(user=user)

        response = self.client.patch(
            "/api/auth/user/update/",
            {
                "first_name": "Ava",
                "care_recipient_name": "Mom",
                "timezone": "America/Chicago",
            },
            format="json",
        )

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data["first_name"], "Ava")
        self.assertEqual(response.data["care_recipient_name"], "Mom")
        self.assertEqual(response.data["timezone"], "America/Chicago")
        self.assertTrue(response.data["has_completed_setup"])

        user.refresh_from_db()
        self.assertEqual(user.care_recipient_name, "Mom")
        self.assertEqual(user.timezone, "America/Chicago")
        self.assertTrue(user.has_completed_setup)

    def test_profile_update_rejects_invalid_timezone(self):
        user = User.objects.create_user(
            username="timecarer",
            email="timecarer@example.com",
            password="TestPass123!",
            email_verified=True,
        )
        self.client.force_authenticate(user=user)

        response = self.client.patch(
            "/api/auth/user/update/",
            {"timezone": "Not/A_Zone"},
            format="json",
        )

        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn("timezone", response.data)
