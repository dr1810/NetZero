from rest_framework.test import APITestCase
from rest_framework import status

from api.models import BuildingProfile


class CarbonPreferenceAPITests(APITestCase):

    def setUp(self):
        self.building = BuildingProfile.objects.create(
            user_email="api@test.com",
            postcode="AB123CD",
            grid_zone_id="GRID1",
            relative_compactness=0.8,
            surface_area=600,
            wall_area=300,
            roof_area=200,
            overall_height=7,
            orientation=2,
            glazing_area=0.2,
            glazing_area_distribution=1,
        )

    def test_reject_negative_threshold(self):
        payload = {
            "building": self.building.id,
            "carbon_intensity_threshold": -100,
            "daily_carbon_budget_kg": 30,
            "automation_enabled": True
        }

        response = self.client.post(
            "/api/preferences/",
            payload,
            format="json"
        )

        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)

    def test_reject_negative_budget(self):
        payload = {
            "building": self.building.id,
            "carbon_intensity_threshold": 200,
            "daily_carbon_budget_kg": -50,
            "automation_enabled": True
        }

        response = self.client.post(
            "/api/preferences/",
            payload,
            format="json"
        )

        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)

    def test_accept_valid_values(self):
        payload = {
            "building": self.building.id,
            "carbon_intensity_threshold": 200,
            "daily_carbon_budget_kg": 50,
            "automation_enabled": True
        }

        response = self.client.post(
            "/api/preferences/",
            payload,
            format="json"
        )

        self.assertEqual(response.status_code, status.HTTP_201_CREATED)