from django.contrib.auth.models import User
from django.test import TestCase

from api.models import BuildingProfile, FlexibleAsset
from api.services.asset_scheduler import evaluate_building_modulation


class AssetSchedulerSmartLogicTests(TestCase):
    def setUp(self):
        self.user = User.objects.create_user(username="scheduler-user", password="password")
        self.building = BuildingProfile.objects.create(
            owner=self.user,
            user_email="scheduler@example.com",
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

    def test_threshold_exceeded_applies_expected_actions(self):
        ev = FlexibleAsset.objects.create(
            building=self.building,
            name="EV Charger Bay A",
            electrical_capacity_kw=7.2,
            criticality_classification="FLEXIBLE",
            is_modulated_active=False,
        )
        hvac = FlexibleAsset.objects.create(
            building=self.building,
            name="Main HVAC Loop",
            electrical_capacity_kw=15.1,
            criticality_classification="FLEXIBLE",
            is_modulated_active=False,
        )
        lighting = FlexibleAsset.objects.create(
            building=self.building,
            name="Lighting Floor 1",
            electrical_capacity_kw=5.0,
            criticality_classification="SHEDDABLE",
            is_modulated_active=False,
        )
        servers = FlexibleAsset.objects.create(
            building=self.building,
            name="Server Rack Cluster",
            electrical_capacity_kw=10.0,
            criticality_classification="CRITICAL",
            is_modulated_active=False,
        )

        decisions = evaluate_building_modulation(
            self.building.id,
            {
                "current_intensity": 450.0,
                "threshold": 300.0,
            },
        )

        decision_by_asset = {d.asset_id: d for d in decisions}

        self.assertIn(ev.id, decision_by_asset)
        self.assertEqual(decision_by_asset[ev.id].action, "DELAYED")
        self.assertAlmostEqual(decision_by_asset[ev.id].estimated_carbon_saved, 1.62, places=2)

        self.assertIn(hvac.id, decision_by_asset)
        self.assertEqual(decision_by_asset[hvac.id].action, "REDUCED")
        self.assertAlmostEqual(decision_by_asset[hvac.id].estimated_carbon_saved, 3.398, places=2)

        self.assertIn(lighting.id, decision_by_asset)
        self.assertEqual(decision_by_asset[lighting.id].action, "SHUTDOWN")
        self.assertAlmostEqual(decision_by_asset[lighting.id].estimated_carbon_saved, 1.8, places=3)

        self.assertNotIn(servers.id, decision_by_asset)

    def test_below_threshold_restores_all_modulated_assets(self):
        ev = FlexibleAsset.objects.create(
            building=self.building,
            name="EV Charger Bay B",
            electrical_capacity_kw=7.2,
            criticality_classification="FLEXIBLE",
            is_modulated_active=True,
        )
        hvac = FlexibleAsset.objects.create(
            building=self.building,
            name="HVAC Zone 2",
            electrical_capacity_kw=15.1,
            criticality_classification="FLEXIBLE",
            is_modulated_active=True,
        )
        lighting = FlexibleAsset.objects.create(
            building=self.building,
            name="Lighting Floor 2",
            electrical_capacity_kw=5.0,
            criticality_classification="SHEDDABLE",
            is_modulated_active=True,
        )

        decisions = evaluate_building_modulation(
            self.building.id,
            {
                "current_intensity": 150.0,
                "threshold": 300.0,
            },
        )

        decision_by_asset = {d.asset_id: d for d in decisions}
        self.assertEqual(decision_by_asset[ev.id].action, "RESTORED")
        self.assertEqual(decision_by_asset[hvac.id].action, "RESTORED")
        self.assertEqual(decision_by_asset[lighting.id].action, "RESTORED")
        self.assertFalse(decision_by_asset[ev.id].new_state)
        self.assertFalse(decision_by_asset[hvac.id].new_state)
        self.assertFalse(decision_by_asset[lighting.id].new_state)

    def test_threshold_exceeded_does_not_modulate_refrigeration(self):
        fridge = FlexibleAsset.objects.create(
            building=self.building,
            name="Main Fridge Unit",
            electrical_capacity_kw=3.0,
            criticality_classification="FLEXIBLE",
            is_modulated_active=False,
        )

        decisions = evaluate_building_modulation(
            self.building.id,
            {
                "current_intensity": 450.0,
                "threshold": 300.0,
            },
        )

        decision_by_asset = {d.asset_id: d for d in decisions}
        self.assertNotIn(fridge.id, decision_by_asset)
