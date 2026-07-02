from rest_framework.test import APITestCase
from rest_framework import status

from api.models import BuildingProfile, CarbonPreference


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

    def test_reject_threshold_too_low(self):
        payload = {
            "building": self.building.id,
            "carbon_intensity_threshold": 2,
            "daily_carbon_budget_kg": 30,
            "automation_enabled": True
        }

        response = self.client.post(
            "/api/preferences/",
            payload,
            format="json"
        )

        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)

    def test_reject_threshold_too_high(self):
        payload = {
            "building": self.building.id,
            "carbon_intensity_threshold": 800,
            "daily_carbon_budget_kg": 30,
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

    def test_create_upserts_existing_preference(self):
        CarbonPreference.objects.create(
            building=self.building,
            carbon_intensity_threshold=220,
            daily_carbon_budget_kg=40,
            automation_enabled=True,
        )

        response = self.client.post(
            "/api/preferences/",
            {
                "building": self.building.id,
                "carbon_intensity_threshold": 180,
                "daily_carbon_budget_kg": 35,
                "automation_enabled": False,
            },
            format="json",
        )

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        pref = CarbonPreference.objects.get(building=self.building)
        self.assertEqual(pref.carbon_intensity_threshold, 180)
        self.assertEqual(pref.daily_carbon_budget_kg, 35)
        self.assertEqual(pref.automation_enabled, False)