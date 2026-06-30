# api/tests/test_portfolio.py

from django.contrib.auth.models import User
from rest_framework.test import APITestCase
from unittest.mock import patch

from api.models import BuildingProfile, FlexibleAsset, ModulationEvent


class PortfolioTests(APITestCase):

    def setUp(self):
        self.user = User.objects.create_user(
            username="testuser",
            password="password123"
        )

        self.client.force_authenticate(
            user=self.user
        )

        BuildingProfile.objects.create(
            owner=self.user,
            user_email="a@test.com",
            postcode="E16AN",
            relative_compactness=0.8,
            surface_area=100,
            wall_area=50,
            roof_area=50,
            overall_height=3,
            orientation=2,
            glazing_area=0.2,
            glazing_area_distribution=1,
            predicted_heating_load=10,
            predicted_cooling_load=20
        )

        BuildingProfile.objects.create(
            owner=self.user,
            user_email="b@test.com",
            postcode="E17AN",
            relative_compactness=0.8,
            surface_area=100,
            wall_area=50,
            roof_area=50,
            overall_height=3,
            orientation=2,
            glazing_area=0.2,
            glazing_area_distribution=1,
            predicted_heating_load=15,
            predicted_cooling_load=25
        )

        self.building = BuildingProfile.objects.filter(owner=self.user).first()
        FlexibleAsset.objects.create(
            building=self.building,
            name="Test Flexible Asset",
            electrical_capacity_kw=12,
            criticality_classification="FLEXIBLE",
            is_modulated_active=True,
        )
        ModulationEvent.objects.create(
            asset=self.building.flexible_assets.first(),
            building=self.building,
            action_type="DELAYED",
            trigger_type="AUTOMATIC",
            carbon_intensity_at_time=320,
            carbon_threshold=280,
            previous_state=False,
            new_state=True,
            reason="test",
            estimated_carbon_saved_kg=1.25,
            initiated_by="system",
        )

    def test_portfolio_totals(self):
        response = self.client.get(
            "/api/buildings/portfolio/"
        )

        self.assertEqual(
            response.data["total_facilities"],
            2
        )

        self.assertEqual(
            response.data["total_heating_load"],
            25
        )

        self.assertEqual(
            response.data["total_cooling_load"],
            45
        )
        self.assertIn("total_flexible_capacity_kw", response.data)
        self.assertIn("cumulative_carbon_reduction_percent", response.data)
        self.assertIn("estimated_cost_savings_gbp", response.data)
        self.assertEqual(response.data["active_modulations"], 1)

    @patch("api.services.asset_scheduler.run_carbon_aware_scheduler")
    def test_centralized_control_runs_for_all_buildings(self, mock_scheduler):
        mock_scheduler.return_value = {"status": "success", "applied_count": 2}

        response = self.client.post(
            "/api/buildings/centralized-control/",
            {"dry_run": False},
            format="json",
        )

        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.data["status"], "applied")
        self.assertEqual(response.data["buildings_processed"], 2)
        self.assertEqual(response.data["total_applied_modulations"], 4)