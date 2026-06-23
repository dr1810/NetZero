"""Simple email dispatch wrapper moved out of views for reuse.
This uses the existing Resend HTTP integration logic and returns (success, reason).
"""
import os
import logging
import requests

def send_sustainability_report(email, report_text, timeout=10):
    api_key = os.environ.get("RESEND_API_KEY")
    if not api_key:
        logging.getLogger(__name__).warning("RESEND_API_KEY not configured; cannot send email to %s", email)
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
                "subject": "NetZero Sustainability Report",
                "text": report_text,
            },
            timeout=timeout,
        )
        if response.status_code in [200, 202]:
            return True, None
        return False, f"remote_service:{response.status_code}"
    except Exception as exc:
        logging.getLogger(__name__).exception("Error calling resend API: %s", exc)
        return False, str(exc)
