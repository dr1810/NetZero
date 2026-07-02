from datetime import timedelta
from unittest.mock import patch

from django.contrib.auth.models import User
from django.utils import timezone
from rest_framework import status
from rest_framework.test import APITestCase

from api.models import BuildingProfile, CarbonPreference, PlannerRecommendation, FlexibleAsset
from api.tasks import run_scheduled_planner_actions_task


class PlannerRecommendationAPITest(APITestCase):
    def setUp(self):
        self.user = User.objects.create_user(username="planner-save-user", password="password")
        self.client.force_authenticate(user=self.user)
        self.building = BuildingProfile.objects.create(
            owner=self.user,
            user_email="save@example.com",
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
        CarbonPreference.objects.create(
            building=self.building,
            carbon_intensity_threshold=50,
            daily_carbon_budget_kg=30,
            automation_enabled=True,
        )
        self.asset = FlexibleAsset.objects.create(
            building=self.building,
            name="EV Charger Bay A",
            electrical_capacity_kw=7.2,
            criticality_classification="FLEXIBLE",
            is_modulated_active=False,
        )

    def _payload(self):
        return {
            "building_id": self.building.id,
            "device_type": "ev_charger",
            "duration_hours": 2,
            "earliest_start": "08:00",
            "latest_finish": "20:00",
            "recommended_start": "13:00",
            "recommended_end": "15:00",
            "flexibility_level": "high",
            "carbon_intensity": 42,
            "estimated_savings_kg": 0.18,
            "alternatives": [
                {
                    "start": "13:00",
                    "end": "15:00",
                    "carbon_intensity": 42,
                    "band": "green",
                    "estimated_savings_kg": 0.18,
                }
            ],
        }

    def test_save_planner_recommendation(self):
        response = self.client.post("/api/energy-planner/save/", self._payload(), format="json")
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        recommendation = PlannerRecommendation.objects.get()
        self.assertEqual(recommendation.action_type, "SAVE_ONLY")
        self.assertEqual(recommendation.status, "SAVED")

    def test_schedule_modulation_recommendation_and_execute_task(self):
        response = self.client.post("/api/energy-planner/schedule-modulation/", self._payload(), format="json")
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        recommendation = PlannerRecommendation.objects.get()
        recommendation.scheduled_for = timezone.now() - timedelta(minutes=1)
        recommendation.recommended_start_at = recommendation.scheduled_for
        recommendation.save(update_fields=["scheduled_for", "recommended_start_at"])

        with patch("api.services.carbon_monitor.should_trigger_modulation") as mock_should_trigger:
            mock_should_trigger.return_value = (
                True,
                {
                    "current_intensity": 240.0,
                    "threshold": 50.0,
                    "index": "very high",
                    "region_id": "13",
                    "timestamp": timezone.now().isoformat(),
                    "source": "test",
                    "generation_mix": [],
                    "fuel_percentages": {},
                    "renewable_share": 20.0,
                    "fossil_share": 80.0,
                    "green_score": 10,
                    "green_score_band": "poor",
                },
            )
            summary = run_scheduled_planner_actions_task()

        recommendation.refresh_from_db()
        self.asset.refresh_from_db()

        self.assertEqual(summary["executed"], 1)
        self.assertEqual(recommendation.status, "EXECUTED")
        self.assertTrue(self.asset.is_modulated_active)