from rest_framework.test import APITestCase
from rest_framework import status

from api.models import BuildingProfile


class CarbonPreferenceAPITests(APITestCase):

    def setUp(self):
        self.building = BuildingProfile.objects.create(
            user_email="test@test.com",
            postcode="AB12CD",
            relative_compactness=0.8,
            surface_area=500,
            wall_area=200,
            roof_area=100,
            overall_height=7,
            orientation=2,
            glazing_area=0.2,
            glazing_area_distribution=1
        )

    def test_reject_negative_threshold(self):
        response = self.client.post(
            "/api/preferences/",
            {
                "building": self.building.id,
                "carbon_intensity_threshold": -10,
                "daily_carbon_budget_kg": 25,
                "automation_enabled": True
            },
            format="json"
        )

        self.assertEqual(
            response.status_code,
            status.HTTP_400_BAD_REQUEST
        )

    def test_create_valid_preference(self):
        response = self.client.post(
            "/api/preferences/",
            {
                "building": self.building.id,
                "carbon_intensity_threshold": 250,
                "daily_carbon_budget_kg": 25,
                "automation_enabled": True
            },
            format="json"
        )

        self.assertEqual(
            response.status_code,
            status.HTTP_201_CREATED
        )