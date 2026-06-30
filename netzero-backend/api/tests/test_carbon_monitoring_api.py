from django.contrib.auth.models import User
from rest_framework import status
from rest_framework.test import APITestCase

from api.models import BuildingProfile


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
