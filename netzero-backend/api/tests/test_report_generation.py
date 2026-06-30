from rest_framework.test import APITestCase
from django.contrib.auth.models import User
from unittest.mock import patch

from api.models import BuildingProfile


class ReportGenerationTests(APITestCase):

    def setUp(self):

        self.user = User.objects.create_user(
            username="testuser",
            password="Test123"
        )

        self.client.force_authenticate(
            user=self.user
        )

        self.building = BuildingProfile.objects.create(
            owner=self.user,
            user_email="test@test.com",
            postcode="EC1A1BB",
            relative_compactness=0.7,
            surface_area=150,
            wall_area=120,
            roof_area=80,
            overall_height=3.5,
            orientation=2,
            glazing_area=0.25,
            glazing_area_distribution=1
        )

    def test_generate_report(self):

        response = self.client.get(
            f"/api/buildings/{self.building.id}/generate_report/"
        )

        self.assertEqual(
            response.status_code,
            200
        )

        self.assertEqual(
            response["Content-Type"],
            "text/csv"
        )

    @patch("api.views.send_sustainability_report")
    def test_email_report_returns_200_when_delivery_fails(self, mock_send):
        mock_send.return_value = (False, "RESEND_API_KEY_NOT_CONFIGURED")

        response = self.client.post(
            f"/api/buildings/{self.building.id}/email_report/"
        )

        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.data["status"], "EMAIL_NOT_SENT")
        self.assertEqual(response.data["reason"], "RESEND_API_KEY_NOT_CONFIGURED")