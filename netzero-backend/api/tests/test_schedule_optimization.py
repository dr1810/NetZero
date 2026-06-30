from datetime import timedelta

from django.contrib.auth.models import User
from django.utils import timezone
from rest_framework.test import APITestCase

from api.models import BuildingProfile, CarbonForecast


class ScheduleOptimizationTests(APITestCase):
    def setUp(self):
        self.user = User.objects.create_user(username="schedule-user", password="password")
        self.client.force_authenticate(user=self.user)
        self.building = BuildingProfile.objects.create(
            owner=self.user,
            user_email="schedule@test.com",
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

        now = timezone.now().replace(minute=0, second=0, microsecond=0)
        for hour in range(24):
            CarbonForecast.objects.create(
                region_id="13",
                forecast_time=now + timedelta(hours=hour),
                intensity_forecast=180 + hour,
                generation_mix=[],
                raw_payload={},
                source="test",
            )

    def test_schedule_endpoint_returns_weighted_optimized_plan(self):
        response = self.client.get(
            f"/api/buildings/{self.building.id}/schedule/?carbon_weight=0.6&cost_weight=0.3&comfort_weight=0.1"
        )

        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.data["optimization_mode"], "forecast_ml_tradeoff")
        self.assertGreaterEqual(len(response.data["hourly_plan"]), 23)
        self.assertLessEqual(len(response.data["hourly_plan"]), 24)
        self.assertIn("weights", response.data)
