import base64
import json
from urllib.error import HTTPError, URLError
from urllib.request import Request, urlopen

from app.config import settings


def main() -> None:
    api_key = settings.mailjet_api_key.get_secret_value()
    secret_key = settings.mailjet_secret_key.get_secret_value()
    sender = settings.mailjet_sender_email.strip()

    if not api_key or not secret_key or not sender:
        raise SystemExit("Missing Mailjet settings in backend/.env.")

    recipient = input("Send test email to an address you own: ").strip()
    if not recipient or "@" not in recipient:
        raise SystemExit("Enter a valid recipient email address.")

    payload = {
        "Messages": [
            {
                "From": {
                    "Email": sender,
                    "Name": settings.mailjet_sender_name,
                },
                "To": [{"Email": recipient}],
                "Subject": "SeekMakan email delivery test",
                "TextPart": (
                    "This is a delivery test from SeekMakan. "
                    "It does not create or verify an account."
                ),
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
    except HTTPError as error:
        raise SystemExit(
            f"Mailjet rejected the request: HTTP {error.code}. "
            "Check your credentials, active sender and account status."
        ) from None
    except (URLError, TimeoutError):
        raise SystemExit(
            "Connection failed or timed out. Check Mailjet activity "
            "before retrying; the email might already have been accepted."
        ) from None

    messages = result.get("Messages", [])
    if not messages or messages[0].get("Status") != "success":
        raise SystemExit("Mailjet did not report success. Check its dashboard.")

    print("Mailjet accepted the email. Check the recipient inbox and spam.")
    print("Acceptance is not confirmation of inbox delivery.")


if __name__ == "__main__":
    main()