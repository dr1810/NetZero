import logging
import os
from urllib.parse import urlencode

import requests
from django.conf import settings
from django.core import signing

logger = logging.getLogger(__name__)

AUTH_VERIFY_SALT = "netzero.auth.verify-email"


def build_email_verification_token(user) -> str:
    return signing.dumps(
        {"user_id": user.id, "email": user.email},
        salt=AUTH_VERIFY_SALT,
    )


def verify_email_token(token: str, max_age_seconds: int = 60 * 60 * 24):
    return signing.loads(token, salt=AUTH_VERIFY_SALT, max_age=max_age_seconds)


def build_verification_url(token: str) -> str:
    base_url = getattr(settings, "FRONTEND_BASE_URL", "http://localhost:3000").rstrip("/")
    query = urlencode({"token": token})
    return f"{base_url}/login?verify_email=1&{query}"


def build_console_url() -> str:
    base_url = getattr(settings, "FRONTEND_BASE_URL", "http://localhost:3000").rstrip("/")
    return f"{base_url}/dashboard"


def send_auth_verification_email(
    email: str,
    verification_url: str,
    first_name: str,
    timeout: int = 10,
):
    api_key = os.environ.get("RESEND_API_KEY")
    if not api_key:
        logger.warning("RESEND_API_KEY not configured; verification email not sent to %s", email)
        return False, "RESEND_API_KEY_NOT_CONFIGURED"

    try:
        response = requests.post(
            "https://api.resend.com/emails",
            headers={
                "Authorization": f"Bearer {api_key}",
                "Content-Type": "application/json",
            },
            json={
                "from": "NetZero <onboarding@resend.dev>",
                "to": [email],
                "subject": "Verify your NetZero account",
                "text": (
                    f"Hello {first_name}, welcome to the website and Let's get started: {build_console_url()}\n\n"
                    "Please verify your email to activate your account:\n"
                    f"{verification_url}\n\n"
                    "If you did not request this account, ignore this email."
                ),
            },
            timeout=timeout,
        )
        if response.status_code in [200, 202]:
            return True, None
        return False, f"remote_service:{response.status_code}"
    except requests.RequestException as exc:
        logger.exception("Failed sending verification email to %s", email)
        return False, str(exc)


def send_account_deleted_email(email: str, first_name: str, timeout: int = 10):
    api_key = os.environ.get("RESEND_API_KEY")
    if not api_key:
        logger.warning("RESEND_API_KEY not configured; account deletion email not sent to %s", email)
        return False, "RESEND_API_KEY_NOT_CONFIGURED"

    try:
        response = requests.post(
            "https://api.resend.com/emails",
            headers={
                "Authorization": f"Bearer {api_key}",
                "Content-Type": "application/json",
            },
            json={
                "from": "NetZero <onboarding@resend.dev>",
                "to": [email],
                "subject": "Your NetZero account was deleted",
                "text": (
                    f"Hello {first_name}, your NetZero account has been deleted.\n\n"
                    "If this was not you, please contact support immediately."
                ),
            },
            timeout=timeout,
        )
        if response.status_code in [200, 202]:
            return True, None
        return False, f"remote_service:{response.status_code}"
    except requests.RequestException as exc:
        logger.exception("Failed sending account deletion email to %s", email)
        return False, str(exc)
