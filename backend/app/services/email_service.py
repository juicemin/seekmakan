import base64
import json
from urllib.error import HTTPError, URLError
from urllib.parse import urlencode
from urllib.request import Request, urlopen

from app.config import settings

class EmailDeliveryError(Exception):
    pass

def send_email(recipient: str, subject: str, text: str) -> None:
    api_key = settings.mailjet_api_key.get_secret_value()
    secret_key = settings.mailjet_secret_key.get_secret_value()
    sender = settings.mailjet_sender_email.strip()

    if not api_key or not secret_key or not sender:
        raise EmailDeliveryError("Email service is not configured.")

    payload = {
        "Messages": [
            {
                "From": {
                    "Email": sender,
                    "Name": settings.mailjet_sender_name,
                },
                "To": [{"Email": recipient}],
                "Subject": subject,
                "TextPart": text,
                "TrackClicks": "disabled",
                "TrackOpens": "disabled",
            }
        ]
    }

    credentials = base64.b64encode(
        f"{api_key}:{secret_key}".encode("utf-8")
    ).decode("ascii")

    request = Request(
        "https://api.mailjet.com/v3.1/send",
        data=json.dumps(payload).encode("utf-8"),
        headers={
            "Authorization": f"Basic {credentials}",
            "Content-Type": "application/json",
        },
        method="POST",
    )

    try:
        with urlopen(request, timeout=20) as response:
            result = json.load(response)
    except (HTTPError, URLError, TimeoutError, ValueError, OSError):
        raise EmailDeliveryError(
            "Email delivery could not be confirmed."
        ) from None

    if not isinstance(result, dict):
        raise EmailDeliveryError("Unexpected email service response.")

    messages = result.get("Messages")
    if (
        not isinstance(messages, list)
        or not messages
        or not isinstance(messages[0], dict)
        or messages[0].get("Status") != "success"
    ):
        raise EmailDeliveryError("Email delivery could not be confirmed.")

def send_verification_email(recipient: str, token: str) -> None:
    link = (
        f"{settings.frontend_url.rstrip('/')}/verify-email"
        f"#{urlencode({'token': token})}"
    )

    send_email(
        recipient,
        "Verify your SeekMakan account",
        (
            "Welcome to SeekMakan!\n\n"
            f"Open this link and press Verify email:\n{link}\n\n"
            "This link expires in 30 minutes and can be used once.\n"
            "If you did not register, ignore this email."
        ),
    )

def send_password_reset_email(recipient: str, token: str) -> None:
    link = (
        f"{settings.frontend_url.rstrip('/')}/reset-password"
        f"#{urlencode({'token': token})}"
    )

    send_email(
        recipient,
        "Reset your SeekMakan password",
        (
            f"Choose a new password using this link:\n{link}\n\n"
            "This link expires in 30 minutes and can be used once.\n"
            "If you did not request this, ignore this email. "
            "Your password has not changed."
        ),
    )

def send_password_changed_email(recipient: str) -> None:
    send_email(
        recipient,
        "Your SeekMakan password was changed",
        (
            "Your SeekMakan password has been changed, and previous "
            "login sessions are no longer valid.\n\n"
            "If you did not make this change, use Forgot password "
            "on SeekMakan to recover your account."
        ),
    )