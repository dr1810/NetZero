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
            {
                "email": "newuser@example.com",
                "password": "secure-pass-123",
                "first_name": "Net",
                "last_name": "Zero",
            },
            format="json",
        )

        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        user = get_user_model().objects.get(username="newuser@example.com")
        self.assertFalse(user.is_active)
        self.assertEqual(user.first_name, "Net")
        self.assertEqual(user.last_name, "Zero")
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

    @patch("api.views.send_auth_verification_email")
    def test_register_resends_for_existing_inactive_user(self, mock_send):
        mock_send.return_value = (True, None)
        User = get_user_model()
        user = User.objects.create_user(
            username="pending@example.com",
            email="pending@example.com",
            password="old-pass",
            is_active=False,
            first_name="Old",
            last_name="Name",
        )

        response = self.client.post(
            "/api/auth/register/",
            {
                "email": "pending@example.com",
                "password": "new-pass-123",
                "first_name": "New",
                "last_name": "Name",
            },
            format="json",
        )

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data["verification_email_sent"], True)
        self.assertIn("not verified", response.data["detail"])
        user.refresh_from_db()
        self.assertFalse(user.is_active)
        self.assertEqual(user.first_name, "New")
        self.assertTrue(user.check_password("new-pass-123"))

    @patch("api.views.send_auth_verification_email")
    def test_register_rejects_existing_active_user(self, mock_send):
        mock_send.return_value = (True, None)
        User = get_user_model()
        User.objects.create_user(
            username="active@example.com",
            email="active@example.com",
            password="pass123",
            is_active=True,
        )

        response = self.client.post(
            "/api/auth/register/",
            {
                "email": "active@example.com",
                "password": "new-pass-123",
                "first_name": "Active",
                "last_name": "User",
            },
            format="json",
        )

        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertEqual(response.data["detail"], "User already exists.")
        mock_send.assert_not_called()

    @patch("api.views.send_account_deleted_email")
    def test_delete_account_removes_authenticated_user(self, mock_send_deleted_email):
        mock_send_deleted_email.return_value = (True, None)
        User = get_user_model()
        user = User.objects.create_user(
            username="delete-me@example.com",
            email="delete-me@example.com",
            password="pass123",
            is_active=True,
        )
        self.client.force_authenticate(user=user)

        response = self.client.delete("/api/auth/delete-account/")

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data["detail"], "Account deleted successfully.")
        self.assertEqual(response.data["deletion_email_sent"], True)
        self.assertFalse(User.objects.filter(id=user.id).exists())
