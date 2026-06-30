from rest_framework.test import APITestCase
from rest_framework import status
from django.contrib.auth.models import User
from api.models import BuildingProfile

class BuildingProfileAPITest(APITestCase):

    def setUp(self):
        # 1. Create a user
        self.user = User.objects.create_user(username="testuser", password="password")
        
        # 2. Force the client to be authenticated as this user
        self.client.force_authenticate(user=self.user)

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
        # Now that you are authenticated, this will not trigger the 
        # AnonymousUser errors in your get_queryset()
        response = self.client.get("/api/buildings/")

        self.assertEqual(
            response.status_code,
            status.HTTP_200_OK
        )

    def test_update_building_without_user_email(self):
        building = BuildingProfile.objects.create(
            owner=self.user,
            user_email="test@example.com",
            postcode="EC1A1BB",
            relative_compactness=0.8,
            surface_area=600,
            wall_area=300,
            roof_area=200,
            overall_height=7,
            orientation=2,
            glazing_area=0.2,
            glazing_area_distribution=1,
        )

        payload = {
            "postcode": "EC1A1BB",
            "relative_compactness": 0.82,
            "surface_area": 610,
            "wall_area": 302,
            "roof_area": 202,
            "overall_height": 7.1,
            "orientation": 3,
            "glazing_area": 0.25,
            "glazing_area_distribution": 2,
        }

        response = self.client.put(f"/api/buildings/{building.id}/", payload, format="json")
        self.assertEqual(response.status_code, status.HTTP_200_OK)

        building.refresh_from_db()
        self.assertEqual(building.user_email, "test@example.com")