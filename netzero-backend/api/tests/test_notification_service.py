from django.test import TestCase
from django.contrib.auth import get_user_model
from api.models import BuildingProfile, CarbonPreference, NotificationEvent
from api.services.notification_service import analyze_forecast_and_notify
from unittest.mock import patch
from django.utils import timezone


class NotificationServiceTest(TestCase):
    def setUp(self):
        User = get_user_model()
        self.user = User.objects.create_user(username="tester", email="tester@example.com", password="pass")
        self.building = BuildingProfile.objects.create(
            owner=self.user,
            user_email=self.user.email,
            postcode="E1 6AN",
            relative_compactness=0.8,
            surface_area=120.0,
            wall_area=50.0,
            roof_area=30.0,
            overall_height=3.0,
            orientation=2,
            glazing_area=10.0,
            glazing_area_distribution=1,
        )
        self.pref = CarbonPreference.objects.create(
            building=self.building,
            carbon_intensity_threshold=150.0,
            daily_carbon_budget_kg=100.0,
            automation_enabled=True,
        )

    @patch("api.services.notification_service.send_sustainability_report")
    def test_detect_spike_and_log_notification(self, mock_send):
        # Simulate send success
        mock_send.return_value = (True, None)

        now = timezone.now()
        forecast = []
        # low values
        for i in range(3):
            forecast.append({"timestamp": (now + timezone.timedelta(hours=i)).isoformat(), "carbon_intensity": 100.0})
        # spike window: next three hours > threshold
        for i in range(3, 6):
            forecast.append({"timestamp": (now + timezone.timedelta(hours=i)).isoformat(), "carbon_intensity": 200.0 + i})
        # back to low
        for i in range(6, 9):
            forecast.append({"timestamp": (now + timezone.timedelta(hours=i)).isoformat(), "carbon_intensity": 90.0})

        events = analyze_forecast_and_notify(self.building, forecast, send_email=True)

        self.assertTrue(len(events) >= 1)
        ne = events[0]
        self.assertEqual(ne.building.id, self.building.id)
        self.assertEqual(ne.event_type, "CARBON_SPIKE")
        self.assertTrue(ne.forecast_peak_value > self.pref.carbon_intensity_threshold)
        # Ensure DB record exists
        self.assertTrue(NotificationEvent.objects.filter(id=ne.id).exists())
        # Ensure send_sustainability_report was called
        mock_send.assert_called()