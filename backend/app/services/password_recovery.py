import logging

from pymongo.database import Database
from pymongo.errors import PyMongoError

from app.repositories.users import issue_password_reset
from app.security import generate_verification_token
from app.services.email_service import (
    EmailDeliveryError,
    send_password_changed_email,
    send_password_reset_email,
)

logger = logging.getLogger(__name__)

def deliver_password_reset(database: Database, email: str) -> None:
    try:
        token = generate_verification_token()
        recipient = issue_password_reset(database, email, token)

        if recipient:
            send_password_reset_email(recipient, token)

    except (PyMongoError, EmailDeliveryError):
        logger.error("Password-reset email processing failed.")

def notify_password_changed(email: str) -> None:
    try:
        send_password_changed_email(email)
    except EmailDeliveryError:
        logger.error("Password-change notification could not be sent.")