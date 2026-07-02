"""SES email dispatch wrapper used by report + notification workflows.
Returns (success, reason).
"""
import os
import logging


def send_sustainability_report(email, report_text, timeout=10):
    # timeout kept in signature for backward compatibility with existing callers.
    _ = timeout

    source_email = os.environ.get("AWS_SES_FROM_EMAIL")
    ses_region = os.environ.get("AWS_SES_REGION", "eu-west-2")

    if not source_email:
        logging.getLogger(__name__).warning("AWS_SES_FROM_EMAIL not configured; cannot send email to %s", email)
        return False, "AWS_SES_FROM_EMAIL_NOT_CONFIGURED"

    try:
        import boto3
        from botocore.exceptions import BotoCoreError, ClientError
    except Exception:
        logging.getLogger(__name__).exception("boto3 is not installed/configured")
        return False, "BOTO3_NOT_INSTALLED"

    try:
        ses = boto3.client("ses", region_name=ses_region)
        ses.send_email(
            Source=source_email,
            Destination={"ToAddresses": [email]},
            Message={
                "Subject": {"Data": "NetZero Sustainability Report"},
                "Body": {"Text": {"Data": report_text}},
            },
        )
        return True, None
    except (ClientError, BotoCoreError) as exc:
        logging.getLogger(__name__).exception("Error calling AWS SES: %s", exc)
        return False, str(exc)
