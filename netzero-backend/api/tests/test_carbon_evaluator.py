from django.test import TestCase

from api.models import (
    BuildingProfile,
    CarbonPreference
)

from api.services.carbon_evaluator import (
    CarbonThresholdEvaluator
)


class CarbonEvaluatorTests(TestCase):

    def setUp(self):

        building = BuildingProfile.objects.create(
            user_email="test@example.com",
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

        self.preference = CarbonPreference.objects.create(
            building=building,
            carbon_intensity_threshold=250,
            daily_carbon_budget_kg=100,
            automation_enabled=True
        )

    def test_threshold_exceeded(self):

        result = CarbonThresholdEvaluator.should_trigger_modulation(
            300,  # current intensity
            self.preference.carbon_intensity_threshold  # threshold
        )

        self.assertTrue(result)

    def test_threshold_not_exceeded(self):

        result = CarbonThresholdEvaluator.should_trigger_modulation(
            200,
            self.preference.carbon_intensity_threshold
        )

        self.assertFalse(result)