from unittest.mock import patch

from django.contrib.auth import get_user_model
from rest_framework import status
from rest_framework.test import APITestCase


class AuthEmailVerificationTests(APITestCase):
    def test_register_creates_active_user_without_verification(self):

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
        self.assertTrue(user.is_active)
        self.assertEqual(user.first_name, "Net")
        self.assertEqual(user.last_name, "Zero")
        self.assertEqual(response.data["account_created"], True)
        self.assertIn("Account created successfully", response.data["detail"])

    def test_register_updates_existing_inactive_user_and_activates(self):
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
        self.assertEqual(response.data["account_created"], False)
        self.assertIn("Account updated successfully", response.data["detail"])
        user.refresh_from_db()
        self.assertTrue(user.is_active)
        self.assertEqual(user.first_name, "New")
        self.assertTrue(user.check_password("new-pass-123"))

    def test_register_rejects_existing_active_user(self):
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

    def test_admin_delete_user_by_email(self):
        User = get_user_model()
        admin_user = User.objects.create_superuser(
            username="admin@example.com",
            email="admin@example.com",
            password="admin-pass-123",
        )
        target_user = User.objects.create_user(
            username="target@example.com",
            email="target@example.com",
            password="target-pass-123",
            is_active=True,
        )
        self.client.force_authenticate(user=admin_user)

        response = self.client.delete(
            "/api/auth/admin/delete-user/",
            {"email": "target@example.com"},
            format="json",
        )

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data["detail"], "User deleted successfully.")
        self.assertEqual(response.data["deleted_user"]["id"], target_user.id)
        self.assertFalse(User.objects.filter(id=target_user.id).exists())

    def test_admin_delete_user_forbidden_for_non_admin(self):
        User = get_user_model()
        regular_user = User.objects.create_user(
            username="regular@example.com",
            email="regular@example.com",
            password="regular-pass-123",
            is_active=True,
        )
        target_user = User.objects.create_user(
            username="target2@example.com",
            email="target2@example.com",
            password="target-pass-456",
            is_active=True,
        )
        self.client.force_authenticate(user=regular_user)

        response = self.client.delete(
            "/api/auth/admin/delete-user/",
            {"email": "target2@example.com"},
            format="json",
        )

        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)
        self.assertTrue(User.objects.filter(id=target_user.id).exists())

    def test_admin_delete_user_rejects_self_delete(self):
        User = get_user_model()
        admin_user = User.objects.create_superuser(
            username="admin2@example.com",
            email="admin2@example.com",
            password="admin-pass-456",
        )
        self.client.force_authenticate(user=admin_user)

        response = self.client.delete(
            "/api/auth/admin/delete-user/",
            {"email": "admin2@example.com"},
            format="json",
        )

        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertEqual(
            response.data["detail"],
            "Admins cannot delete their own account via this endpoint.",
        )
        self.assertTrue(User.objects.filter(id=admin_user.id).exists())
