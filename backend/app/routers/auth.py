from fastapi import APIRouter, Depends, HTTPException, Request
from pymongo.database import Database
from pymongo.errors import DuplicateKeyError, PyMongoError
from fastapi import BackgroundTasks
from app.config import settings
from app.schemas.auth import ForgotPasswordRequest, ResetPasswordRequest
from app.repositories.users import reset_user_password
from app.services.sessions import COOKIE_NAME
from app.services.password_recovery import (
    deliver_password_reset,
    notify_password_changed,
)
from app.database import get_database
from app.repositories.users import (
    activate_user,
    create_pending_user,
    replace_pending_registration,
)
from app.schemas.auth import RegisterRequest, VerifyEmailRequest
from app.security import generate_verification_token
from app.services.auth_limits import (
    AuthRateLimitError,
    enforce_limit,
)
from app.services.email_service import (
    EmailDeliveryError,
    send_verification_email,
)

import secrets
from fastapi import Response
from app.schemas.auth import LoginRequest
from app.security import hash_password, verify_password
from app.services.sessions import (
    end_session,
    find_session_user,
    public_user,
    require_browser_request,
    start_session,
)
from app.schemas.auth import ResendVerificationRequest
from app.repositories.users import renew_verification_token

router = APIRouter(
    prefix="/api/auth",
    tags=["Authentication"],
)

DUMMY_PASSWORD_HASH = hash_password(secrets.token_urlsafe(32))

VERIFICATION_SENT_MESSAGE = (
    "A verification email has been sent to your email address. "
    "Please check your inbox and spam folder to verify your account "
    "before logging in."
)

VERIFICATION_GENERIC_MESSAGE = (
    "Unable to send a new verification email for this request. "
    "Check for an earlier email, wait a minute before retrying, "
    "or log in if already verified."
)

@router.post(
    "/register",
    status_code=202,
    dependencies=[Depends(require_browser_request)],
)
def register(
    data: RegisterRequest,
    request: Request,
    database: Database = Depends(get_database),
) -> dict[str, str]:
    client_ip = request.client.host if request.client else "unknown"
    email_key = str(data.email).lower()

    try:
        enforce_limit(database, f"register-ip:{client_ip}", 10, 3600)
        enforce_limit(database, f"register-email:{email_key}", 5, 3600)

        # Initial local-demo budget: at most 50 accepted attempts per UTC day.
        enforce_limit(database, "registration-global", 50, 86400)

        token = generate_verification_token()

        try:
            create_pending_user(database, data, token)
            should_send = True
        except DuplicateKeyError:
            should_send = replace_pending_registration(database, data, token)

        if should_send:
            send_verification_email(str(data.email), token)
            return {"message": VERIFICATION_SENT_MESSAGE}

        return {"message": VERIFICATION_GENERIC_MESSAGE}

    except AuthRateLimitError:
        raise HTTPException(
            status_code=429,
            detail="Too many attempts. Please try again later.",
        ) from None
    except EmailDeliveryError:
        raise HTTPException(
            status_code=503,
            detail=(
                "Email delivery could not be confirmed. Check your inbox "
                "and spam first. If nothing arrives, wait one minute and "
                "submit registration again. Use the newest link."
            ),
        ) from None
    except PyMongoError:
        raise HTTPException(
            status_code=503,
            detail="Account service is temporarily unavailable.",
        ) from None


@router.post(
    "/verify-email",
    dependencies=[Depends(require_browser_request)],
)
def verify_email(
    data: VerifyEmailRequest,
    request: Request,
    database: Database = Depends(get_database),
) -> dict[str, str]:
    client_ip = request.client.host if request.client else "unknown"

    try:
        enforce_limit(database, f"verify-ip:{client_ip}", 30, 3600)

        if not activate_user(database, data.token):
            raise HTTPException(
                status_code=400,
                detail=(
                    "This verification link is invalid, expired or already "
                    "used. If necessary, submit registration again."
                ),
            )

        return {"message": "Your email is verified. Your account is active."}

    except AuthRateLimitError:
        raise HTTPException(
            status_code=429,
            detail="Too many attempts. Please try again later.",
        ) from None
    except PyMongoError:
        raise HTTPException(
            status_code=503,
            detail="Account service is temporarily unavailable.",
        ) from None

@router.post(
    "/login",
    dependencies=[Depends(require_browser_request)],
)
def login(
    data: LoginRequest,
    request: Request,
    response: Response,
    database: Database = Depends(get_database),
) -> dict:
    client_ip = request.client.host if request.client else "unknown"
    email_key = str(data.email).lower()

    try:
        enforce_limit(database, f"login-ip:{client_ip}", 30, 900)
        enforce_limit(database, f"login-email:{email_key}", 10, 900)

        user = database["users"].find_one({"email_key": email_key})
        stored_hash = (
            user["password_hash"] if user else DUMMY_PASSWORD_HASH
        )

        valid_password = verify_password(
            data.password.get_secret_value(),
            stored_hash,
        )

        if not user or not valid_password:
            raise HTTPException(
                status_code=401,
                detail="Email or password is incorrect.",
            )

        if user.get("status") != "active" or not user.get("email_verified_at"):
            raise HTTPException(
                status_code=403,
                detail=(
                    "Your account is not active. Verify your email first. "
                    "For an expired link, submit registration again."
                ),
            )

        start_session(database, user, request, response)
        return {"user": public_user(user)}

    except AuthRateLimitError:
        raise HTTPException(
            status_code=429,
            detail="Too many login attempts. Try again later.",
        ) from None
    except PyMongoError:
        raise HTTPException(
            status_code=503,
            detail="Account service is temporarily unavailable.",
        ) from None


@router.get("/me")
def current_session(
    request: Request,
    response: Response,
    database: Database = Depends(get_database),
) -> dict:
    response.headers["Cache-Control"] = "no-store"

    try:
        user = find_session_user(database, request)
        return {"user": public_user(user) if user else None}
    except PyMongoError:
        raise HTTPException(
            status_code=503,
            detail="Account service is temporarily unavailable.",
        ) from None

@router.post(
    "/logout",
    dependencies=[Depends(require_browser_request)],
)
def logout(
    request: Request,
    response: Response,
    database: Database = Depends(get_database),
) -> dict[str, str]:
    try:
        end_session(database, request, response)
        return {"message": "You have logged out."}
    except PyMongoError:
        raise HTTPException(
            status_code=503,
            detail="Logout could not be completed. Please try again.",
        ) from None

@router.post(
    "/resend-verification",
    status_code=202,
    dependencies=[Depends(require_browser_request)],
)
def resend_verification(
    data: ResendVerificationRequest,
    request: Request,
    database: Database = Depends(get_database),
) -> dict[str, str]:
    client_ip = request.client.host if request.client else "unknown"
    email = str(data.email)

    try:
        enforce_limit(database, f"resend-ip:{client_ip}", 10, 3600)
        enforce_limit(database, f"resend-email:{email.lower()}", 5, 3600)

        # Share the existing registration email budget.
        enforce_limit(database, "registration-global", 50, 86400)

        token = generate_verification_token()
        recipient = renew_verification_token(database, email, token)

        if recipient is None:
            return {"message": VERIFICATION_GENERIC_MESSAGE}

        send_verification_email(recipient, token)

        return {
            "message": (
                "A new verification email has been sent. "
                "Please use the latest link."
            )
        }

    except AuthRateLimitError:
        raise HTTPException(
            status_code=429,
            detail="Too many requests. Please try again later.",
        ) from None
    except EmailDeliveryError:
        raise HTTPException(
            status_code=503,
            detail=(
                "Email delivery could not be confirmed. Check your inbox "
                "and spam folder. If nothing arrives, wait one minute "
                "and try again."
            ),
        ) from None
    except PyMongoError:
        raise HTTPException(
            status_code=503,
            detail="Account service is temporarily unavailable.",
        ) from None

@router.post(
    "/forgot-password",
    status_code=202,
    dependencies=[Depends(require_browser_request)],
)
def forgot_password(
    data: ForgotPasswordRequest,
    request: Request,
    background_tasks: BackgroundTasks,
    database: Database = Depends(get_database),
) -> dict[str, str]:
    client_ip = request.client.host if request.client else "unknown"
    email = str(data.email)

    try:
        enforce_limit(database, f"forgot-ip:{client_ip}", 10, 3600)
        enforce_limit(database, f"forgot-email:{email.lower()}", 5, 3600)
        enforce_limit(database, "registration-global", 50, 86400)

        background_tasks.add_task(deliver_password_reset, database, email)

        return {
            "message": (
                "If this email belongs to a verified account, "
                "we’ll send a password-reset link. "
                "Check your inbox and spam folder."
            )
        }

    except AuthRateLimitError:
        raise HTTPException(
            status_code=429,
            detail="Too many requests. Please try again later.",
        ) from None
    except PyMongoError:
        raise HTTPException(
            status_code=503,
            detail="Account service is temporarily unavailable.",
        ) from None

@router.post(
    "/reset-password",
    dependencies=[Depends(require_browser_request)],
)
def reset_password(
    data: ResetPasswordRequest,
    request: Request,
    response: Response,
    background_tasks: BackgroundTasks,
    database: Database = Depends(get_database),
) -> dict[str, str]:
    client_ip = request.client.host if request.client else "unknown"

    try:
        enforce_limit(database, f"reset-ip:{client_ip}", 10, 900)

        user = reset_user_password(
            database,
            data.token,
            data.new_password.get_secret_value(),
        )

    except AuthRateLimitError:
        raise HTTPException(
            status_code=429,
            detail="Too many attempts. Please try again later.",
        ) from None

    except PyMongoError:
        raise HTTPException(
            status_code=503,
            detail="Account service is temporarily unavailable.",
        ) from None

    if user is None:
        raise HTTPException(
            status_code=400,
            detail="This reset link is invalid, expired or already used.",
        )

    response.delete_cookie(
        key=COOKIE_NAME,
        path="/",
        secure=settings.session_cookie_secure,
        httponly=True,
        samesite="lax",
    )
    response.headers["Cache-Control"] = "no-store"

    background_tasks.add_task(
        notify_password_changed,
        user["email"],
    )

    return {
        "message": (
            "Password updated. Please log in with your new password."
        )
    }