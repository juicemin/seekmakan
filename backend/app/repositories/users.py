from datetime import datetime, timedelta, timezone
from pymongo.database import Database
from app.schemas.auth import RegisterRequest
from app.security import (
    hash_password,
    hash_verification_token,
)
from pymongo import ReturnDocument

def create_user_indexes(database: Database) -> None:
    users = database["users"]

    users.create_index(
        "email_key",
        unique=True,
        name="user_email_unique",
    )

    users.create_index(
        "verification_token_hash",
        unique=True,
        partialFilterExpression={
            "verification_token_hash": {"$type": "string"},
        },
        name="user_verification_token_unique",
    )

    database["users"].create_index(
        "reset_token_hash",
        unique=True,
        partialFilterExpression={
            "reset_token_hash": {"$type": "string"},
        },
        name="user_reset_token_unique",
    )

    database["auth_rate_limits"].create_index(
        "expires_at",
        expireAfterSeconds=0,
        name="auth_rate_limit_expiry",
    )

    database["sessions"].create_index(
        "expires_at",
        expireAfterSeconds=0,
        name="session_expiry",
    )


def create_pending_user(
    database: Database,
    registration: RegisterRequest,
    verification_token: str,
) -> str:
    now = datetime.now(timezone.utc)
    email = str(registration.email)

    document = {
        "display_name": registration.display_name,
        "email": email,
        "email_key": email.lower(),
        "password_hash": hash_password(
            registration.password.get_secret_value()
        ),
        "role": "user",
        "status": "pending",
        "email_verified_at": None,
        "verification_token_hash": hash_verification_token(
            verification_token
        ),
        "verification_expires_at": now + timedelta(minutes=30),
        "created_at": now,
        "updated_at": now,
    }

    result = database["users"].insert_one(document)
    return str(result.inserted_id)


def activate_user(
    database: Database,
    verification_token: str,
) -> bool:
    now = datetime.now(timezone.utc)

    result = database["users"].update_one(
        {
            "status": "pending",
            "verification_token_hash": hash_verification_token(
                verification_token
            ),
            "verification_expires_at": {"$gt": now},
        },
        {
            "$set": {
                "status": "active",
                "email_verified_at": now,
                "updated_at": now,
            },
            "$unset": {
                "verification_token_hash": "",
                "verification_expires_at": "",
            },
        },
    )

    return result.modified_count == 1

def replace_pending_registration(
    database: Database,
    registration: RegisterRequest,
    verification_token: str,
) -> bool:
    now = datetime.now(timezone.utc)

    result = database["users"].update_one(
        {
            "email_key": str(registration.email).lower(),
            "status": "pending",
            "updated_at": {"$lte": now - timedelta(seconds=60)},
        },
        {
            "$set": {
                "display_name": registration.display_name,
                "email": str(registration.email),
                "password_hash": hash_password(
                    registration.password.get_secret_value()
                ),
                "verification_token_hash": hash_verification_token(
                    verification_token
                ),
                "verification_expires_at": now + timedelta(minutes=30),
                "updated_at": now,
            }
        },
    )

    return result.modified_count == 1

def renew_verification_token(
    database: Database,
    email: str,
    token: str,
) -> str | None:
    now = datetime.now(timezone.utc)

    user = database["users"].find_one_and_update(
        {
            "email_key": email.lower(),
            "status": "pending",
            "updated_at": {"$lte": now - timedelta(seconds=60)},
        },
        {
            "$set": {
                "verification_token_hash": hash_verification_token(token),
                "verification_expires_at": now + timedelta(minutes=30),
                "updated_at": now,
            }
        },
        projection={"email": 1},
        return_document=ReturnDocument.AFTER,
    )

    return user["email"] if user else None

def issue_password_reset(
    database: Database,
    email: str,
    token: str,
) -> str | None:
    now = datetime.now(timezone.utc)

    user = database["users"].find_one_and_update(
        {
            "email_key": email.lower(),
            "status": "active",
            "email_verified_at": {"$ne": None},
            "$or": [
                {"reset_requested_at": {"$exists": False}},
                {
                    "reset_requested_at": {
                        "$lte": now - timedelta(seconds=60)
                    }
                },
            ],
        },
        {
            "$set": {
                "reset_token_hash": hash_verification_token(token),
                "reset_expires_at": now + timedelta(minutes=30),
                "reset_requested_at": now,
            }
        },
        projection={"email": 1},
        return_document=ReturnDocument.AFTER,
    )

    return user["email"] if user else None


def reset_user_password(
    database: Database,
    token: str,
    new_password: str,
) -> dict | None:
    now = datetime.now(timezone.utc)

    return database["users"].find_one_and_update(
        {
            "status": "active",
            "email_verified_at": {"$ne": None},
            "reset_token_hash": hash_verification_token(token),
            "reset_expires_at": {"$gt": now},
        },
        {
            "$set": {
                "password_hash": hash_password(new_password),
                "updated_at": now,
            },
            "$inc": {"auth_version": 1},
            "$unset": {
                "reset_token_hash": "",
                "reset_expires_at": "",
            },
        },
        projection={"email": 1},
        return_document=ReturnDocument.AFTER,
    )