from django.urls import reverse
from rest_framework import status
from rest_framework.test import APITestCase
from django.contrib.auth.models import User

from api.models import (
    BuildingProfile,
    CarbonPreference
)


class CarbonPreferenceTests(APITestCase):

    def setUp(self):
        # Create user and authenticate
        self.user = User.objects.create_user(username="testuser", password="password")
        self.client.force_authenticate(user=self.user)

        # Corrected: Use keyword arguments, not dictionary syntax
        self.building = BuildingProfile.objects.create(
            user_email="test@example.com",
            postcode="EC1A1BB",
            relative_compactness=0.75,
            surface_area=150,
            wall_area=120,
            roof_area=80,
            overall_height=3.5,
            orientation=2,
            glazing_area=0.25,
            glazing_area_distribution=1,
            owner=self.user  # Ensure your model has this field
        )

        self.url = "/api/preferences/"
    def test_create_valid_preference(self):
        payload = {
            "building": self.building.id,
            "carbon_intensity_threshold": 180,
            "daily_carbon_budget_kg": 25,
            "automation_enabled": True
        }

        response = self.client.post(
            self.url,
            payload,
            format="json"
        )

        self.assertEqual(
            response.status_code,
            status.HTTP_201_CREATED
        )

        self.assertEqual(
            CarbonPreference.objects.count(),
            1
        )

    def test_reject_negative_threshold(self):
        payload = {
            "building": self.building.id,
            "carbon_intensity_threshold": -50,
            "daily_carbon_budget_kg": 25,
            "automation_enabled": True
        }

        response = self.client.post(
            self.url,
            payload,
            format="json"
        )

        self.assertEqual(
            response.status_code,
            status.HTTP_400_BAD_REQUEST
        )

    def test_reject_negative_carbon_budget(self):
        payload = {
            "building": self.building.id,
            "carbon_intensity_threshold": 180,
            "daily_carbon_budget_kg": -10,
            "automation_enabled": True
        }

        response = self.client.post(
            self.url,
            payload,
            format="json"
        )

        self.assertEqual(
            response.status_code,
            status.HTTP_400_BAD_REQUEST
        )

    def test_reject_invalid_building(self):
        payload = {
            "building": 9999,
            "carbon_intensity_threshold": 180,
            "daily_carbon_budget_kg": 25,
            "automation_enabled": True
        }

        response = self.client.post(
            self.url,
            payload,
            format="json"
        )

        self.assertEqual(
            response.status_code,
            status.HTTP_400_BAD_REQUEST
        )

from api.models import BuildingProfile


class BuildingProfileTests(APITestCase):

    def setUp(self):
        # 1. Create a test user
        self.user = User.objects.create_user(username="testuser", password="password")
        
        # 2. Force the client to be authenticated as this user
        self.client.force_authenticate(user=self.user)
        
        self.url = "/api/buildings/"

        self.valid_payload = {
            "user_email": "test@example.com",
            "postcode": "EC1A1BB",
            "relative_compactness": 0.75,
            "surface_area": 150,
            "wall_area": 120,
            "roof_area": 80,
            "overall_height": 3.5,
            "orientation": 2,
            "glazing_area": 0.25,
            "glazing_area_distribution": 1
        }

    def test_create_building_profile(self):
        """
        API integration test:
        Verify HTTP 201 response.
        """

        response = self.client.post(
            self.url,
            self.valid_payload,
            format="json"
        )

        self.assertEqual(
            response.status_code,
            status.HTTP_201_CREATED
        )

    def test_database_record_created(self):
        """
        Database insertion test:
        Verify row is persisted.
        """

        self.client.post(
            self.url,
            self.valid_payload,
            format="json"
        )

        self.assertEqual(
            BuildingProfile.objects.count(),
            1
        )

        building = BuildingProfile.objects.first()

        self.assertEqual(
            building.postcode,
            "EC1A1BB"
        )

    def test_invalid_missing_surface_area(self):
        """
        Validation test:
        Required fields must be enforced.
        """

        payload = self.valid_payload.copy()
        payload.pop("surface_area")

        response = self.client.post(
            self.url,
            payload,
            format="json"
        )

        self.assertEqual(
            response.status_code,
            status.HTTP_400_BAD_REQUEST
        )

    def test_invalid_negative_surface_area(self):
        """
        Validation test:
        Invalid numeric values rejected.
        """

        payload = self.valid_payload.copy()
        payload["surface_area"] = -100

        response = self.client.post(
            self.url,
            payload,
            format="json"
        )

        self.assertEqual(
            response.status_code,
            status.HTTP_400_BAD_REQUEST
        )

    def test_get_building_profiles(self):
        """
        API integration test:
        Verify GET endpoint returns records.
        """

        self.client.post(
            self.url,
            self.valid_payload,
            format="json"
        )

        response = self.client.get(self.url)

        self.assertEqual(
            response.status_code,
            status.HTTP_200_OK
        )

        self.assertEqual(
            len(response.data),
            1
        )