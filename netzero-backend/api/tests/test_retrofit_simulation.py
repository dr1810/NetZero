from rest_framework.test import APITestCase
from rest_framework import status

from api.models import BuildingProfile


class RetrofitSimulationTests(APITestCase):

    def setUp(self):

        self.building = BuildingProfile.objects.create(
            user_email="retrofit@test.com",
            postcode="AB12CD",
            relative_compactness=0.75,
            surface_area=600,
            wall_area=250,
            roof_area=150,
            overall_height=7,
            orientation=2,
            glazing_area=0.20,
            glazing_area_distribution=1
        )

    def test_simulation_endpoint_returns_success(self):

        payload = {
            "surface_area": 700,
            "wall_area": 300
        }

        response = self.client.post(
            f"/api/buildings/{self.building.id}/simulate/",
            payload,
            format="json"
        )

        self.assertEqual(
            response.status_code,
            status.HTTP_200_OK
        )

    def test_original_building_not_modified(self):

        payload = {
            "surface_area": 900
        }

        self.client.post(
            f"/api/buildings/{self.building.id}/simulate/",
            payload,
            format="json"
        )

        self.building.refresh_from_db()

        self.assertEqual(
            self.building.surface_area,
            600
        )

    def test_simulation_reflects_modified_values(self):

        payload = {
            "surface_area": 900
        }

        response = self.client.post(
            f"/api/buildings/{self.building.id}/simulate/",
            payload,
            format="json"
        )

        self.assertEqual(
            response.status_code,
            status.HTTP_200_OK
        )

        self.assertEqual(
            response.data["surface_area"],
            900
        )
    def test_modified_parameters_are_used(self):
        payload = {
            "surface_area": 1200,
            "wall_area": 500
        }

        response = self.client.post(
            f"/api/buildings/{self.building.id}/simulate/",
            payload,
            format="json"
        )

        self.assertEqual(
            response.data["surface_area"],
            1200
        )

        self.assertEqual(
            response.data["wall_area"],
            500
        )   