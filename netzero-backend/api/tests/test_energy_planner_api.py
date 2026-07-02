from datetime import timedelta

from django.contrib.auth.models import User
from django.utils import timezone
from rest_framework import status
from rest_framework.test import APITestCase

from api.models import BuildingProfile, CarbonForecast


class EnergyPlannerAPITest(APITestCase):
    def setUp(self):
        self.user = User.objects.create_user(username="planner-user", password="password")
        self.client.force_authenticate(user=self.user)
        self.building = BuildingProfile.objects.create(
            owner=self.user,
            user_email="planner@example.com",
            postcode="EC1A1BB",
            grid_zone_id="13",
            relative_compactness=0.8,
            surface_area=600,
            wall_area=300,
            roof_area=200,
            overall_height=7,
            orientation=2,
            glazing_area=0.2,
            glazing_area_distribution=1,
        )

        base = timezone.localtime().replace(hour=8, minute=0, second=0, microsecond=0)
        intensities = [220, 180, 95, 60, 70, 140, 210]
        for offset, intensity in enumerate(intensities):
            CarbonForecast.objects.create(
                region_id="13",
                forecast_time=base + timedelta(hours=offset),
                intensity_forecast=float(intensity),
                generation_mix=[],
                raw_payload={},
            )

    def test_energy_planner_returns_best_window(self):
        response = self.client.post(
            "/api/energy-planner/",
            {
                "building_id": self.building.id,
                "device_type": "washing_machine",
                "duration_hours": 2,
                "earliest_start": "08:00",
                "latest_finish": "15:00",
                "flexibility_level": "medium",
            },
            format="json",
        )

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data["recommended_start"], "11:00")
        self.assertEqual(response.data["carbon_intensity"], 65.0)
        self.assertGreater(response.data["estimated_savings_kg"], 0)
        self.assertGreaterEqual(len(response.data["alternatives"]), 1)
        self.assertEqual(response.data["alternatives"][0]["band"], "green")

    def test_energy_planner_rejects_window_without_forecast_data(self):
        CarbonForecast.objects.all().delete()
        response = self.client.post(
            "/api/energy-planner/",
            {
                "building_id": self.building.id,
                "device_type": "ev_charger",
                "duration_hours": 2,
                "earliest_start": "08:00",
                "latest_finish": "20:00",
            },
            format="json",
        )

        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn("No carbon forecast data available", str(response.data))