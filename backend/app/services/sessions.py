import hashlib
import re
import secrets
from datetime import datetime, timedelta, timezone

from fastapi import Depends, HTTPException, Request, Response
from pymongo.database import Database
from pymongo.errors import PyMongoError

from app.config import settings
from app.database import get_database

COOKIE_NAME = "seekmakan_session"
SESSION_SECONDS = 8 * 60 * 60
IDLE_MINUTES = 30

def require_browser_request(request: Request) -> None:
    origin = request.headers.get("origin")
    marker = request.headers.get("x-requested-with")

    if origin not in settings.allowed_origins or marker != "SeekMakan":
        raise HTTPException(
            status_code=403,
            detail="Request origin is not allowed.",
        )


def session_key(token: str) -> str:
    return hashlib.sha256(token.encode("utf-8")).hexdigest()


def read_session_token(request: Request) -> str | None:
    token = request.cookies.get(COOKIE_NAME, "")

    if not re.fullmatch(r"[A-Za-z0-9_-]{43}", token):
        return None

    return token


def public_user(user: dict) -> dict:
    return {
        "id": str(user["_id"]),
        "display_name": user["display_name"],
        "email": user["email"],
        "role": user["role"],
        "preference_setup": user.get("preference_setup", "not_started"),
    }


def start_session(
    database: Database,
    user: dict,
    request: Request,
    response: Response,
) -> None:
    old_token = read_session_token(request)

    if old_token:
        database["sessions"].delete_one(
            {"_id": session_key(old_token)}
        )

    token = secrets.token_urlsafe(32)
    now = datetime.now(timezone.utc)

    database["sessions"].insert_one(
        {
            "_id": session_key(token),
            "user_id": user["_id"],
            "auth_version": user.get("auth_version", 0),
            "created_at": now,
            "last_seen_at": now,
            "expires_at": now + timedelta(seconds=SESSION_SECONDS),
        }
    )

    response.set_cookie(
        key=COOKIE_NAME,
        value=token,
        max_age=SESSION_SECONDS,
        httponly=True,
        secure=settings.session_cookie_secure,
        samesite="lax",
        path="/",
    )
    response.headers["Cache-Control"] = "no-store"


def find_session_user(
    database: Database,
    request: Request,
) -> dict | None:
    token = read_session_token(request)

    if not token:
        return None

    now = datetime.now(timezone.utc)

    session = database["sessions"].find_one_and_update(
        {
            "_id": session_key(token),
            "expires_at": {"$gt": now},
            "last_seen_at": {
                "$gt": now - timedelta(minutes=IDLE_MINUTES)
            },
        },
        {"$set": {"last_seen_at": now}},
    )

    if not session:
        return None

    return database["users"].find_one(
        {
            "_id": session["user_id"],
            "status": "active",
            "$expr": {
                "$eq": [
                    {"$ifNull": ["$auth_version", 0]},
                    session.get("auth_version", 0),
                ]
            },
            "email_verified_at": {"$ne": None},
        },
        {
            "_id": 1,
            "display_name": 1,
            "email": 1,
            "role": 1,
            "preferences": 1,
            "preference_setup" : 1,
        },
    )


def end_session(
    database: Database,
    request: Request,
    response: Response,
) -> None:
    token = read_session_token(request)

    if token:
        database["sessions"].delete_one(
            {"_id": session_key(token)}
        )

    response.delete_cookie(
        COOKIE_NAME,
        path="/",
        secure=settings.session_cookie_secure,
        httponly=True,
        samesite="lax",
    )
    response.headers["Cache-Control"] = "no-store"


def get_current_user(
    request: Request,
    database: Database = Depends(get_database),
) -> dict:
    try:
        user = find_session_user(database, request)
    except PyMongoError:
        raise HTTPException(
            status_code=503,
            detail="Account service is temporarily unavailable.",
        ) from None

    if user is None:
        raise HTTPException(
            status_code=401,
            detail="Please log in to continue.",
        )

    return user