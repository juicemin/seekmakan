from datetime import datetime, timezone
from pymongo import ReturnDocument
from pymongo.database import Database
from app.schemas.profile import ProfileUpdate, UserPreferences

def serialize_profile(user: dict) -> dict:
    preferences = UserPreferences.model_validate(
        user.get("preferences", {})
    )

    return {
        "id": str(user["_id"]),
        "display_name": user["display_name"],
        "email": user["email"],
        # Routes only accept active, email-verified users.
        "email_verified": True,
        "preferences": preferences.model_dump(mode="json"),
        "preference_setup": user.get("preference_setup", "not_started"),
    }

def save_profile(
    database: Database,
    user_id,
    data: ProfileUpdate,
) -> dict | None:
    now = datetime.now(timezone.utc)

    user = database["users"].find_one_and_update(
        {
            "_id": user_id,
            "status": "active",
            "email_verified_at": {"$ne": None},
        },
        {
            "$set": {
                "display_name": data.display_name,
                "preferences": data.preferences.model_dump(mode="json"),
                "preference_setup": "completed",
                "preferences_updated_at": now,
                "updated_at": now,
            }
        },
        projection={
            "display_name": 1,
            "email": 1,
            "preferences": 1,
            "preference_setup": 1,
        },
        return_document=ReturnDocument.AFTER,
    )

    return serialize_profile(user) if user else None

def skip_preference_setup(database: Database, user_id) -> None:
    database["users"].update_one(
        {
            "_id": user_id,
            "status": "active",
            "$or": [
                {"preference_setup": {"$exists": False}},
                {"preference_setup": "not_started"},
            ],
        },
        {
            "$set": {
                "preference_setup": "skipped",
                "updated_at": datetime.now(timezone.utc),
            }
        },
    )