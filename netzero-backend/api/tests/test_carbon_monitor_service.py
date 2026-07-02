from unittest.mock import Mock, patch

from django.test import TestCase
from django.utils import timezone
from django.core.cache import cache

from api.models import BuildingProfile, CarbonPreference
from api.services.carbon_monitor import get_current_carbon_intensity, should_trigger_modulation


class CarbonMonitorServiceTest(TestCase):
    def setUp(self):
        cache.clear()

    @patch("api.services.carbon_monitor.requests.get")
    def test_get_current_carbon_intensity_parses_new_regional_shape(self, mock_get):
        payload = {
            "data": [
                {
                    "regionid": 13,
                    "dnoregion": "UKPN London",
                    "shortname": "London",
                    "data": [
                        {
                            "from": "2026-07-02T10:00Z",
                            "to": "2026-07-02T10:30Z",
                            "intensity": {
                                "forecast": 44,
                                "actual": 48,
                                "index": "low",
                            },
                            "generationmix": [
                                {"fuel": "wind", "perc": 28.3},
                                {"fuel": "gas", "perc": 14.8},
                            ],
                        }
                    ],
                }
            ]
        }

        mock_response = Mock()
        mock_response.status_code = 200
        mock_response.text = ""
        mock_response.raise_for_status.return_value = None
        mock_response.json.return_value = payload
        mock_get.return_value = mock_response

        result = get_current_carbon_intensity(region_id="13", postcode="ec1a 1bb")

        self.assertIsNotNone(result)
        self.assertEqual(result["intensity"], 48.0)
        self.assertEqual(result["index"], "low")
        self.assertEqual(result["region_id"], "13")
        self.assertEqual(result["source"], "eso_regional_postcode")
        self.assertEqual(result["fuel_percentages"].get("wind"), 28.3)
        self.assertEqual(result["fuel_percentages"].get("gas"), 14.8)
        called_url = mock_get.call_args[0][0]
        self.assertEqual(called_url, "https://api.carbonintensity.org.uk/regional/postcode/EC1A1BB")

    @patch("api.services.carbon_monitor.requests.get")
    def test_should_trigger_modulation_uses_actual_value_from_new_shape(self, mock_get):
        user_email = "monitor@test.com"
        building = BuildingProfile.objects.create(
            user_email=user_email,
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
            predicted_heating_load=10,
            predicted_cooling_load=5,
            created_at=timezone.now(),
        )
        CarbonPreference.objects.create(
            building=building,
            carbon_intensity_threshold=45,
            daily_carbon_budget_kg=30,
            automation_enabled=True,
        )

        payload = {
            "data": [
                {
                    "regionid": 13,
                    "data": [
                        {
                            "from": "2026-07-02T10:00Z",
                            "to": "2026-07-02T10:30Z",
                            "intensity": {
                                "forecast": 44,
                                "actual": 64,
                                "index": "low",
                            },
                            "generationmix": [],
                        }
                    ],
                }
            ]
        }

        mock_response = Mock()
        mock_response.status_code = 200
        mock_response.text = ""
        mock_response.raise_for_status.return_value = None
        mock_response.json.return_value = payload
        mock_get.return_value = mock_response

        should_modulate, carbon_data = should_trigger_modulation(building.id)

        self.assertTrue(should_modulate)
        self.assertIsNotNone(carbon_data)
        self.assertEqual(carbon_data["current_intensity"], 64.0)
        self.assertEqual(carbon_data["threshold"], 50.0)
