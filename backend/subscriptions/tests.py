"""
Subscription app tests.

Add your tests here. The LicenseService, Plan, and UserSubscription models
are tested via integration — create a real PostgreSQL test database.
"""
from django.contrib.auth import get_user_model
from django.contrib.auth.models import AnonymousUser
from django.test import TestCase

from subscriptions.services import LicenseService

User = get_user_model()


class SubscriptionsSmoke(TestCase):
    """Verify the subscriptions app can be imported without errors."""

    def test_models_importable(self):
        from subscriptions.models import BkashTransaction, Plan, SubscriptionEvent, UserSubscription  # noqa: F401

    def test_services_importable(self):
        from subscriptions.services import LicenseService  # noqa: F401

    def test_admin_services_importable(self):
        from subscriptions.admin_services import AdminPaymentsService  # noqa: F401


class LicenseServiceAccessTests(TestCase):
    def test_has_calm_compass_access_returns_true_for_active_authenticated_user(self):
        user = User.objects.create_user(
            username="active-user",
            email="active@example.com",
            password="TestPass123!",
        )

        self.assertTrue(LicenseService.has_calm_compass_access(user))

    def test_has_calm_compass_access_returns_false_for_inactive_user(self):
        user = User.objects.create_user(
            username="inactive-user",
            email="inactive@example.com",
            password="TestPass123!",
            is_active=False,
        )

        self.assertFalse(LicenseService.has_calm_compass_access(user))

    def test_has_calm_compass_access_returns_false_for_anonymous_user(self):
        self.assertFalse(LicenseService.has_calm_compass_access(AnonymousUser()))
