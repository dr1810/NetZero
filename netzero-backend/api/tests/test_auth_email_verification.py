from unittest.mock import patch

from django.contrib.auth import get_user_model
from rest_framework import status
from rest_framework.test import APITestCase

from api.services.auth_verification import build_email_verification_token


class AuthEmailVerificationTests(APITestCase):
    @patch("api.views.send_auth_verification_email")
    def test_register_sends_verification_and_creates_inactive_user(self, mock_send):
        mock_send.return_value = (True, None)

        response = self.client.post(
            "/api/auth/register/",
            {"email": "newuser@example.com", "password": "secure-pass-123"},
            format="json",
        )

        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        user = get_user_model().objects.get(username="newuser@example.com")
        self.assertFalse(user.is_active)
        self.assertEqual(response.data["verification_email_sent"], True)

    @patch("api.views.send_auth_verification_email")
    def test_verify_email_activates_user_and_returns_tokens(self, mock_send):
        mock_send.return_value = (True, None)
        User = get_user_model()
        user = User.objects.create_user(
            username="verifyme@example.com",
            email="verifyme@example.com",
            password="pass123",
            is_active=False,
        )
        token = build_email_verification_token(user)

        response = self.client.post(
            "/api/auth/verify-email/",
            {"token": token},
            format="json",
        )

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        user.refresh_from_db()
        self.assertTrue(user.is_active)
        self.assertIn("access", response.data)
        self.assertIn("refresh", response.data)
