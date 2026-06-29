from unittest.mock import Mock

import requests
from django.test import TestCase
from django.utils import timezone

from api.models import CarbonForecast
from api.services.forecast_ingestion import ingest_region_forecast


class ForecastIngestionTests(TestCase):
    def test_ingestion_parses_and_stores_forecast_points(self):
        mock_client = Mock()
        mock_response = Mock()
        mock_response.raise_for_status.return_value = None
        mock_response.json.return_value = {
            "data": [
                {
                    "data": [
                        {
                            "from": "2026-06-29T10:00Z",
                            "to": "2026-06-29T10:30Z",
                            "intensity": {"forecast": 120, "index": "low"},
                            "generationmix": [{"fuel": "wind", "perc": 40}],
                        },
                        {
                            "from": "2026-06-29T10:30Z",
                            "to": "2026-06-29T11:00Z",
                            "intensity": {"forecast": 130, "index": "moderate"},
                            "generationmix": [{"fuel": "gas", "perc": 30}],
                        },
                    ]
                }
            ]
        }
        mock_client.get.return_value = mock_response

        result = ingest_region_forecast(region_id="13", http_client=mock_client)

        self.assertFalse(result.used_fallback)
        self.assertEqual(result.stored_points, 2)
        self.assertEqual(CarbonForecast.objects.filter(region_id="13").count(), 2)

    def test_ingestion_uses_cached_fallback_when_api_fails(self):
        CarbonForecast.objects.create(
            region_id="13",
            forecast_time=timezone.now(),
            intensity_forecast=180.0,
            generation_mix=[],
            raw_payload={"seed": True},
            source="national_grid_eso",
        )

        mock_client = Mock()
        mock_client.get.side_effect = requests.RequestException("timeout")

        result = ingest_region_forecast(region_id="13", http_client=mock_client)

        self.assertTrue(result.used_fallback)
        self.assertGreaterEqual(result.stored_points, 1)
        self.assertTrue(CarbonForecast.objects.filter(region_id="13").exists())
