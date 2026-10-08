from fastapi import Depends, HTTPException

from app.services.sessions import get_current_user

def require_admin(user: dict = Depends(get_current_user)) -> dict:
    if user.get("role") != "admin":
        raise HTTPException(403, "Administrator access required.")

    return user