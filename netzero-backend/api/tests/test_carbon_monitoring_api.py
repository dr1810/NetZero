from unittest.mock import patch

from django.contrib.auth.models import User
from rest_framework import status
from rest_framework.test import APITestCase

from api.models import BuildingProfile, FlexibleAsset, ModulationEvent


class CarbonMonitoringAPITest(APITestCase):
    def setUp(self):
        self.user = User.objects.create_user(username="carbon-user", password="password")
        self.client.force_authenticate(user=self.user)
        self.building = BuildingProfile.objects.create(
            owner=self.user,
            user_email="carbon@example.com",
            postcode="EC1A1BB",
            grid_zone_id=None,
            relative_compactness=0.8,
            surface_area=600,
            wall_area=300,
            roof_area=200,
            overall_height=7,
            orientation=2,
            glazing_area=0.2,
            glazing_area_distribution=1,
        )

    def test_carbon_intensity_returns_ok_when_preference_missing(self):
        response = self.client.get(f"/api/buildings/{self.building.id}/carbon-intensity/")
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data["should_modulate"], False)
        self.assertIn("current_intensity", response.data)
        self.assertIn("threshold", response.data)

    @patch("api.services.carbon_monitor.get_current_carbon_intensity")
    def test_trigger_modulation_modulates_registered_assets_without_preference(self, mock_current):
        self.building.grid_zone_id = "1"
        self.building.save(update_fields=["grid_zone_id"])

        asset = FlexibleAsset.objects.create(
            building=self.building,
            name="HVAC Unit",
            electrical_capacity_kw=10,
            criticality_classification="FLEXIBLE",
            is_modulated_active=False,
        )

        mock_current.return_value = {
            "intensity": 450.0,
            "timestamp": "2026-07-02T12:00:00Z",
            "index": "very high",
            "region_id": "1",
            "source": "test",
        }

        response = self.client.post(
            f"/api/buildings/{self.building.id}/trigger-modulation/",
            {"dry_run": False},
            format="json",
        )

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data["status"], "success")
        self.assertEqual(response.data["applied_count"], 1)

        asset.refresh_from_db()
        self.assertTrue(asset.is_modulated_active)

    @patch("api.services.carbon_monitor.get_current_carbon_intensity")
    def test_trigger_modulation_rejects_building_not_owned_by_user(self, mock_current):
        other_user = User.objects.create_user(username="other-user", password="password")
        other_building = BuildingProfile.objects.create(
            owner=other_user,
            user_email="other@example.com",
            postcode="EC1A1BB",
            grid_zone_id="1",
            relative_compactness=0.8,
            surface_area=600,
            wall_area=300,
            roof_area=200,
            overall_height=7,
            orientation=2,
            glazing_area=0.2,
            glazing_area_distribution=1,
        )

        response = self.client.post(
            f"/api/buildings/{other_building.id}/trigger-modulation/",
            {"dry_run": False},
            format="json",
        )

        self.assertEqual(response.status_code, status.HTTP_404_NOT_FOUND)
        mock_current.assert_not_called()

    @patch("api.services.carbon_monitor.get_current_carbon_intensity")
    def test_set_asset_modulation_enables_asset_and_logs_manual_event(self, mock_current):
        self.building.grid_zone_id = "1"
        self.building.save(update_fields=["grid_zone_id"])
        asset = FlexibleAsset.objects.create(
            building=self.building,
            name="Battery System",
            electrical_capacity_kw=12,
            criticality_classification="SHEDDABLE",
            is_modulated_active=False,
        )

        mock_current.return_value = {
            "intensity": 500.0,
            "timestamp": "2026-07-02T12:00:00Z",
            "index": "very high",
            "region_id": "1",
            "source": "test",
        }

        response = self.client.post(
            f"/api/assets/{asset.id}/set-modulation/",
            {"active": True},
            format="json",
        )

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data["status"], "success")
        self.assertEqual(response.data["is_modulated_active"], True)
        self.assertEqual(response.data["action_type"], "SHUTDOWN")

        asset.refresh_from_db()
        self.assertTrue(asset.is_modulated_active)
        event = ModulationEvent.objects.filter(asset=asset).latest("id")
        self.assertEqual(event.trigger_type, "MANUAL")
        self.assertTrue(event.new_state)

    def test_set_asset_modulation_rejects_non_owned_asset(self):
        other_user = User.objects.create_user(username="owner-2", password="password")
        other_building = BuildingProfile.objects.create(
            owner=other_user,
            user_email="owner2@example.com",
            postcode="EC1A1BB",
            grid_zone_id="1",
            relative_compactness=0.8,
            surface_area=600,
            wall_area=300,
            roof_area=200,
            overall_height=7,
            orientation=2,
            glazing_area=0.2,
            glazing_area_distribution=1,
        )
        other_asset = FlexibleAsset.objects.create(
            building=other_building,
            name="Other Asset",
            electrical_capacity_kw=4,
            criticality_classification="FLEXIBLE",
            is_modulated_active=False,
        )

        response = self.client.post(
            f"/api/assets/{other_asset.id}/set-modulation/",
            {"active": True},
            format="json",
        )

        self.assertEqual(response.status_code, status.HTTP_404_NOT_FOUND)
