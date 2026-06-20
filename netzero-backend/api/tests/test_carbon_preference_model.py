from django.test import TestCase
from django.core.exceptions import ValidationError

from api.models import BuildingProfile, CarbonPreference


class CarbonPreferenceModelTests(TestCase):

    def setUp(self):
        self.building = BuildingProfile.objects.create(
            user_email="test@example.com",
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

    def test_negative_carbon_threshold_rejected(self):
        preference = CarbonPreference(
            building=self.building,
            carbon_intensity_threshold=-10,
            daily_carbon_budget_kg=25,
        )

        with self.assertRaises(ValidationError):
            preference.full_clean()

    def test_negative_daily_budget_rejected(self):
        preference = CarbonPreference(
            building=self.building,
            carbon_intensity_threshold=150,
            daily_carbon_budget_kg=-5,
        )

        with self.assertRaises(ValidationError):
            preference.full_clean()

    def test_valid_values_accepted(self):
        preference = CarbonPreference(
            building=self.building,
            carbon_intensity_threshold=150,
            daily_carbon_budget_kg=25,
        )

        preference.full_clean()  # should not raise