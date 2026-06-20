from rest_framework.test import APITestCase
from rest_framework import status


class BuildingProfileAPITest(APITestCase):

    def test_create_building(self):
        payload = {
            "user_email": "test@example.com",
            "postcode": "AB123CD",
            "relative_compactness": 0.8,
            "surface_area": 600,
            "wall_area": 300,
            "roof_area": 200,
            "overall_height": 7,
            "orientation": 2,
            "glazing_area": 0.2,
            "glazing_area_distribution": 1
        }

        response = self.client.post(
            "/api/buildings/",
            payload,
            format="json"
        )

        self.assertEqual(
            response.status_code,
            status.HTTP_201_CREATED
        )

    def test_get_buildings(self):
        response = self.client.get("/api/buildings/")

        self.assertEqual(
            response.status_code,
            status.HTTP_200_OK
        )