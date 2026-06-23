# api/tests/test_portfolio.py

from django.contrib.auth.models import User
from rest_framework.test import APITestCase
from api.models import BuildingProfile


class PortfolioTests(APITestCase):

    def setUp(self):
        self.user = User.objects.create_user(
            username="testuser",
            password="password123"
        )

        self.client.force_authenticate(
            user=self.user
        )

        BuildingProfile.objects.create(
            owner=self.user,
            user_email="a@test.com",
            postcode="E16AN",
            relative_compactness=0.8,
            surface_area=100,
            wall_area=50,
            roof_area=50,
            overall_height=3,
            orientation=2,
            glazing_area=0.2,
            glazing_area_distribution=1,
            predicted_heating_load=10,
            predicted_cooling_load=20
        )

        BuildingProfile.objects.create(
            owner=self.user,
            user_email="b@test.com",
            postcode="E17AN",
            relative_compactness=0.8,
            surface_area=100,
            wall_area=50,
            roof_area=50,
            overall_height=3,
            orientation=2,
            glazing_area=0.2,
            glazing_area_distribution=1,
            predicted_heating_load=15,
            predicted_cooling_load=25
        )

    def test_portfolio_totals(self):
        response = self.client.get(
            "/api/buildings/portfolio/"
        )

        self.assertEqual(
            response.data["total_facilities"],
            2
        )

        self.assertEqual(
            response.data["total_heating_load"],
            25
        )

        self.assertEqual(
            response.data["total_cooling_load"],
            45
        )