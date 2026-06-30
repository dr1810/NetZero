import logging
import os
from typing import Optional, Tuple
from urllib.parse import urlencode

from django.conf import settings
from django.core import signing
from django.core.mail import send_mail

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


def _send(*, to: str, subject: str, body: str) -> Tuple[bool, Optional[str]]:
    """Send an email via Django's configured email backend (Gmail SMTP in production)."""
    try:
        send_mail(
            subject=subject,
            message=body,
            from_email=settings.DEFAULT_FROM_EMAIL,
            recipient_list=[to],
            fail_silently=False,
        )
        return True, None
    except Exception as exc:  # noqa: BLE001
        logger.exception("Failed sending email to %s: %s", to, exc)
        return False, str(exc)


def send_auth_verification_email(
    email: str,
    verification_url: str,
    first_name: str,
    **_kwargs,
) -> Tuple[bool, Optional[str]]:
    body = (
        f"Hello {first_name}, welcome to the website and Let's get started: {build_console_url()}\n\n"
        "Please verify your email to activate your account:\n"
        f"{verification_url}\n\n"
        "If you did not request this account, ignore this email."
    )
    return _send(
        to=email,
        subject="Verify your NetZero account",
        body=body,
    )


def send_account_deleted_email(email: str, first_name: str, **_kwargs) -> Tuple[bool, Optional[str]]:
    body = (
        f"Hello {first_name}, your NetZero account has been deleted.\n\n"
        "If this was not you, please contact support immediately."
    )
    return _send(
        to=email,
        subject="Your NetZero account was deleted",
        body=body,
    )

