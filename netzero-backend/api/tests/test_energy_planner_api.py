from datetime import timedelta
from unittest.mock import patch

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
        self.assertIn(response.data["recommended_start"], ["10:00", "11:00"])
        self.assertEqual(response.data["carbon_intensity"], 65.0)
        self.assertGreater(response.data["estimated_savings_kg"], 0)
        self.assertGreaterEqual(len(response.data["alternatives"]), 1)
        self.assertEqual(response.data["alternatives"][0]["band"], "green")

    def test_energy_planner_returns_uniform_validation_error_shape(self):
        response = self.client.post(
            "/api/energy-planner/",
            {
                "building_id": self.building.id,
                "device_type": "washing_machine",
                "duration_hours": 2,
                "earliest_start": "20:00",
                "latest_finish": "08:00",
            },
            format="json",
        )

        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertEqual(response.data["detail"], "Planner validation failed.")
        self.assertIn("latest_finish", response.data["errors"])

    @patch("api.services.energy_planner.ingest_region_forecast")
    def test_energy_planner_rejects_window_without_forecast_data(self, mock_ingest):
        CarbonForecast.objects.all().delete()
        mock_ingest.return_value = type("Result", (), {
            "region_id": "13",
            "stored_points": 0,
            "used_fallback": False,
            "error": "no data",
        })()
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

    @patch("api.services.energy_planner.ingest_region_forecast")
    def test_energy_planner_ingests_forecast_on_demand(self, mock_ingest):
        CarbonForecast.objects.all().delete()

        def fake_ingest(region_id):
            base = timezone.localtime().replace(minute=0, second=0, microsecond=0)
            horizon = [210, 190, 170, 150, 130, 120, 95, 85, 75, 65, 70, 90, 110, 130, 150, 170, 180, 160, 140, 120, 100, 90, 80, 70, 65, 75, 95, 115, 135, 155, 175, 195]
            for offset, intensity in enumerate(horizon):
                CarbonForecast.objects.create(
                    region_id=region_id,
                    forecast_time=base + timedelta(hours=offset),
                    intensity_forecast=float(intensity),
                    generation_mix=[],
                    raw_payload={},
                )
            return type("Result", (), {
                "region_id": region_id,
                "stored_points": 5,
                "used_fallback": False,
                "error": None,
            })()

        mock_ingest.side_effect = fake_ingest

        response = self.client.post(
            "/api/energy-planner/",
            {
                "building_id": self.building.id,
                "device_type": "washing_machine",
                "duration_hours": 2,
                "earliest_start": "08:00",
                "latest_finish": "13:00",
            },
            format="json",
        )

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertIn("recommended_start", response.data)
        self.assertIn("recommended_end", response.data)

    @patch("api.services.energy_planner.timezone.localtime")
    def test_energy_planner_rolls_to_next_day_when_window_already_elapsed(self, mock_localtime):
        CarbonForecast.objects.all().delete()

        current = timezone.now().astimezone(timezone.get_current_timezone())
        now = current.replace(hour=22, minute=30, second=0, microsecond=0)
        mock_localtime.return_value = now

        next_day_base = (now + timedelta(days=1)).replace(hour=8, minute=0, second=0, microsecond=0)
        for offset, intensity in enumerate([210, 150, 80, 65, 90, 130]):
            CarbonForecast.objects.create(
                region_id="13",
                forecast_time=next_day_base + timedelta(hours=offset),
                intensity_forecast=float(intensity),
                generation_mix=[],
                raw_payload={},
            )

        response = self.client.post(
            "/api/energy-planner/",
            {
                "building_id": self.building.id,
                "device_type": "washing_machine",
                "duration_hours": 2,
                "earliest_start": "08:00",
                "latest_finish": "20:00",
                "flexibility_level": "medium",
            },
            format="json",
        )

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertIn(response.data["recommended_start"], ["10:00", "11:00"])