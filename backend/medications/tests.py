from datetime import datetime
from unittest.mock import patch
from zoneinfo import ZoneInfo

from django.contrib.auth import get_user_model
from django.test import TestCase
from rest_framework import status
from rest_framework.test import APIClient

from medications.models import Medication, MedicationLog

User = get_user_model()


class MedicationApiTests(TestCase):
    @classmethod
    def setUpTestData(cls):
        cls.user = User.objects.create_user(
            username="caregiver",
            email="caregiver@example.com",
            password="TestPass123!",
            email_verified=True,
            timezone="America/New_York",
        )
        cls.other_user = User.objects.create_user(
            username="other",
            email="other@example.com",
            password="TestPass123!",
            email_verified=True,
            timezone="America/Chicago",
        )

    def setUp(self):
        self.client = APIClient()

    def authenticate(self, user=None):
        self.client.force_authenticate(user=user or self.user)

    def create_fixed_medication(self, *, user=None, name="Donepezil", dose="10 mg"):
        medication = Medication.objects.create(
            user=user or self.user,
            name=name,
            dose=dose,
        )
        medication.schedules.create(
            schedule_type="fixed",
            time_of_day="08:00",
            days_of_week=[],
        )
        return medication

    def create_interval_medication(
        self,
        *,
        user=None,
        name="Pain relief",
        dose="1 tablet",
    ):
        medication = Medication.objects.create(
            user=user or self.user,
            name=name,
            dose=dose,
        )
        medication.schedules.create(
            schedule_type="interval",
            interval_hours=8,
            anchor_time="06:00",
        )
        return medication

    def test_create_medication_with_fixed_schedule(self):
        self.authenticate()

        response = self.client.post(
            "/api/medications/",
            {
                "name": "Donepezil",
                "dose": "10 mg",
                "schedules": [
                    {
                        "schedule_type": "fixed",
                        "time_of_day": "08:00",
                        "days_of_week": ["mon", "wed", "fri"],
                    },
                    {
                        "schedule_type": "fixed",
                        "time_of_day": "20:00",
                        "days_of_week": [],
                    },
                ],
            },
            format="json",
        )

        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertEqual(len(response.data["schedules"]), 2)
        self.assertIn("08:00", response.data["schedule_summary"])

    def test_create_medication_with_interval_schedule(self):
        self.authenticate()

        response = self.client.post(
            "/api/medications/",
            {
                "name": "Pain relief",
                "dose": "1 tablet",
                "schedules": [
                    {
                        "schedule_type": "interval",
                        "interval_hours": 8,
                        "anchor_time": "06:00",
                    }
                ],
            },
            format="json",
        )

        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertEqual(response.data["schedules"][0]["interval_hours"], 8)

    def test_invalid_interval_hours_rejected(self):
        self.authenticate()

        response = self.client.post(
            "/api/medications/",
            {
                "name": "Pain relief",
                "dose": "1 tablet",
                "schedules": [
                    {
                        "schedule_type": "interval",
                        "interval_hours": 0,
                        "anchor_time": "06:00",
                    }
                ],
            },
            format="json",
        )

        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn("schedules", response.data)

    def test_invalid_weekday_values_rejected(self):
        self.authenticate()

        response = self.client.post(
            "/api/medications/",
            {
                "name": "Donepezil",
                "dose": "10 mg",
                "schedules": [
                    {
                        "schedule_type": "fixed",
                        "time_of_day": "08:00",
                        "days_of_week": ["mon", "holiday"],
                    }
                ],
            },
            format="json",
        )

        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn("schedules", response.data)

    def test_empty_schedules_rejected(self):
        self.authenticate()

        response = self.client.post(
            "/api/medications/",
            {
                "name": "Donepezil",
                "dose": "10 mg",
                "schedules": [],
            },
            format="json",
        )

        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn("schedules", response.data)

    def test_medication_edit_replaces_nested_schedules(self):
        self.authenticate()
        medication = self.create_fixed_medication()

        response = self.client.patch(
            f"/api/medications/{medication.id}/",
            {
                "name": "Donepezil",
                "dose": "5 mg",
                "schedules": [
                    {
                        "schedule_type": "interval",
                        "interval_hours": 6,
                        "anchor_time": "07:30",
                    }
                ],
            },
            format="json",
        )

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        medication.refresh_from_db()
        self.assertEqual(medication.dose, "5 mg")
        self.assertEqual(medication.schedules.count(), 1)
        self.assertEqual(medication.schedules.first().schedule_type, "interval")

    def test_medication_delete_archives_and_preserves_history(self):
        self.authenticate()
        medication = self.create_fixed_medication()
        log = MedicationLog.objects.create(
            medication=medication,
            scheduled_for=datetime(2026, 4, 14, 12, 0, tzinfo=ZoneInfo("UTC")),
            status="taken",
            medication_name_snapshot=medication.name,
            dose_snapshot=medication.dose,
        )

        response = self.client.delete(f"/api/medications/{medication.id}/")

        self.assertEqual(response.status_code, status.HTTP_204_NO_CONTENT)
        medication.refresh_from_db()
        self.assertFalse(medication.is_active)
        self.assertTrue(MedicationLog.objects.filter(id=log.id).exists())
        list_response = self.client.get("/api/medications/")
        self.assertEqual(list_response.status_code, status.HTTP_200_OK)
        self.assertEqual(list_response.data, [])

    def test_upcoming_endpoint_returns_fixed_schedule_doses(self):
        self.authenticate()
        medication = self.create_fixed_medication()
        medication.schedules.create(
            schedule_type="fixed",
            time_of_day="20:00",
            days_of_week=[],
        )
        with patch("medications.views.timezone.now") as mocked_now:
            mocked_now.return_value = datetime(
                2026,
                4,
                14,
                10,
                30,
                tzinfo=ZoneInfo("UTC"),
            )
            response = self.client.get("/api/medications/upcoming/")

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(len(response.data), 2)
        self.assertEqual(response.data[0]["medication"]["id"], str(medication.id))

    def test_upcoming_endpoint_returns_interval_schedule_doses(self):
        self.authenticate()
        medication = self.create_interval_medication()
        with patch("medications.views.timezone.now") as mocked_now:
            mocked_now.return_value = datetime(
                2026,
                4,
                14,
                10,
                30,
                tzinfo=ZoneInfo("UTC"),
            )
            response = self.client.get("/api/medications/upcoming/")

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(len(response.data), 3)
        self.assertEqual(response.data[0]["medication"]["id"], str(medication.id))

    def test_dose_log_create_and_upsert(self):
        self.authenticate()
        medication = self.create_fixed_medication()
        scheduled_for = "2026-04-14T12:00:00Z"

        first = self.client.post(
            "/api/medications/logs/",
            {
                "medication_id": str(medication.id),
                "scheduled_for": scheduled_for,
                "status": "taken",
            },
            format="json",
        )
        second = self.client.post(
            "/api/medications/logs/",
            {
                "medication_id": str(medication.id),
                "scheduled_for": scheduled_for,
                "status": "refused",
            },
            format="json",
        )

        self.assertEqual(first.status_code, status.HTTP_200_OK)
        self.assertEqual(second.status_code, status.HTTP_200_OK)
        self.assertEqual(MedicationLog.objects.count(), 1)
        self.assertEqual(MedicationLog.objects.first().status, "refused")

    def test_log_snapshot_preserved_after_medication_edit(self):
        self.authenticate()
        medication = self.create_fixed_medication()

        self.client.post(
            "/api/medications/logs/",
            {
                "medication_id": str(medication.id),
                "scheduled_for": "2026-04-14T12:00:00Z",
                "status": "taken",
            },
            format="json",
        )
        self.client.patch(
            f"/api/medications/{medication.id}/",
            {
                "name": "Donepezil updated",
                "dose": "5 mg",
                "schedules": [
                    {
                        "schedule_type": "fixed",
                        "time_of_day": "08:00",
                        "days_of_week": [],
                    }
                ],
            },
            format="json",
        )

        response = self.client.get("/api/medications/")

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data[0]["latest_log"]["medication_name_snapshot"], "Donepezil")
        self.assertEqual(response.data[0]["latest_log"]["dose_snapshot"], "10 mg")

    def test_adherence_endpoint_returns_correct_week_counts(self):
        self.authenticate()
        medication = self.create_fixed_medication()
        self.client.post(
            "/api/medications/logs/",
            {
                "medication_id": str(medication.id),
                "scheduled_for": "2026-04-07T12:00:00Z",
                "status": "taken",
            },
            format="json",
        )
        self.client.post(
            "/api/medications/logs/",
            {
                "medication_id": str(medication.id),
                "scheduled_for": "2026-04-08T12:00:00Z",
                "status": "skipped",
            },
            format="json",
        )

        with patch("medications.views.timezone.now") as mocked_now:
            mocked_now.return_value = datetime(
                2026,
                4,
                14,
                10,
                30,
                tzinfo=ZoneInfo("UTC"),
            )
            response = self.client.get("/api/medications/adherence/?range=week")

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data["expected_count"], 7)
        self.assertEqual(response.data["logged_count"], 2)
        self.assertEqual(response.data["pending_count"], 5)
        self.assertEqual(response.data["medications"][0]["taken_count"], 1)
        self.assertEqual(response.data["medications"][0]["skipped_count"], 1)

    def test_user_isolation_across_endpoints(self):
        other_medication = self.create_fixed_medication(user=self.other_user)
        self.authenticate()

        detail_response = self.client.get(f"/api/medications/{other_medication.id}/")
        log_response = self.client.post(
            "/api/medications/logs/",
            {
                "medication_id": str(other_medication.id),
                "scheduled_for": "2026-04-14T12:00:00Z",
                "status": "taken",
            },
            format="json",
        )

        self.assertEqual(detail_response.status_code, status.HTTP_404_NOT_FOUND)
        self.assertEqual(log_response.status_code, status.HTTP_400_BAD_REQUEST)

    def test_anonymous_access_rejected(self):
        medication = self.create_fixed_medication()
        endpoints = [
            ("/api/medications/", "get"),
            ("/api/medications/", "post"),
            (f"/api/medications/{medication.id}/", "get"),
            (f"/api/medications/{medication.id}/", "patch"),
            (f"/api/medications/{medication.id}/", "delete"),
            ("/api/medications/upcoming/", "get"),
            ("/api/medications/adherence/?range=week", "get"),
            ("/api/medications/logs/", "post"),
        ]

        for path, method in endpoints:
            if method == "post":
                response = self.client.post(path, {}, format="json")
            elif method == "patch":
                response = self.client.patch(path, {}, format="json")
            else:
                response = getattr(self.client, method)(path)
            self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)
