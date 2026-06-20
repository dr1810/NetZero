from django.test import TestCase

from api.models import (
    BuildingProfile,
    FlexibleAsset
)

from api.services.load_modulation import (
    LoadModulationService
)


class LoadModulationTests(TestCase):

    def setUp(self):

        self.building = BuildingProfile.objects.create(
            user_email="test@test.com",
            postcode="SW1A1AA",
            relative_compactness=0.75,
            surface_area=600,
            wall_area=250,
            roof_area=150,
            overall_height=7,
            orientation=2,
            glazing_area=0.2,
            glazing_area_distribution=1
        )

        self.critical = FlexibleAsset.objects.create(
            building=self.building,
            name="Server Rack",
            electrical_capacity_kw=15,
            criticality_classification="CRITICAL"
        )

        self.flexible = FlexibleAsset.objects.create(
            building=self.building,
            name="HVAC Unit",
            electrical_capacity_kw=10,
            criticality_classification="FLEXIBLE"
        )

    def test_only_non_critical_assets_are_modulated(self):

        LoadModulationService.modulate_building_assets(
            self.building
        )

        self.critical.refresh_from_db()
        self.flexible.refresh_from_db()

        self.assertFalse(
            self.critical.is_modulated_active
        )

        self.assertTrue(
            self.flexible.is_modulated_active
        )