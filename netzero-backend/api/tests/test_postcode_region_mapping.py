from unittest.mock import Mock

from django.test import TestCase
import requests

from api.services.postcode_region import (
    fallback_region_id_from_postcode,
    map_postcode_to_region_id,
    normalize_postcode,
    validate_postcode_format,
)


class PostcodeRegionMappingTests(TestCase):
    def test_predefined_postcode_dataset_fallback_mapping(self):
        dataset = {
            "EC1A 1BB": "13",
            "E16 4AN": "13",
            "IV1 1SG": "1",
            "EH1 1RE": "2",
            "G1 1HX": "2",
            "M1 1AE": "3",
            "NE1 1EN": "4",
            "S1 2BP": "5",
            "B1 1TF": "8",
            "NG1 1AA": "9",
            "LL11 1AY": "6",
            "CF10 1EP": "7",
            "CB1 1PT": "10",
            "BS1 5TR": "11",
            "SO14 3FE": "12",
            "BN1 1GE": "14",
        }
        for postcode, expected_region in dataset.items():
            self.assertEqual(fallback_region_id_from_postcode(postcode), expected_region)

    def test_validate_postcode_format(self):
        self.assertTrue(validate_postcode_format("EC1A 1BB"))
        self.assertTrue(validate_postcode_format("ec1a1bb"))
        self.assertFalse(validate_postcode_format("INVALID"))

    def test_map_postcode_to_region_id_from_api_payload(self):
        mock_client = Mock()
        mock_response = Mock()
        mock_response.json.return_value = {"data": [{"regionid": 13}]}
        mock_response.raise_for_status.return_value = None
        mock_client.get.return_value = mock_response

        result = map_postcode_to_region_id("AB1 2CD", http_client=mock_client)
        self.assertEqual(result, "13")

    def test_map_postcode_to_region_id_uses_fallback_on_api_error(self):
        mock_client = Mock()
        mock_client.get.side_effect = requests.RequestException("network error")

        result = map_postcode_to_region_id("M1 1AE", http_client=mock_client)
        self.assertEqual(result, "3")

    def test_normalize_postcode(self):
        self.assertEqual(normalize_postcode("ec1a1bb"), "EC1A 1BB")
