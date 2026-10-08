import hashlib
import re
import unicodedata

from pymongo.database import Database
from app.schemas.submission import RestaurantSubmissionInput

class DuplicateSubmission(Exception):
    pass

def normalise(value: str) -> str:
    return " ".join(
        unicodedata.normalize("NFKC", value).casefold().split()
    )

def name_pattern(name: str) -> str:
    # Also supports stored bilingual names separated by "/".
    parts = [part.strip() for part in name.split("/") if part.strip()]
    return "|".join(re.escape(part) for part in parts)

def duplicate_key(payload: RestaurantSubmissionInput) -> str:
    value = (
        normalise(payload.name)
        + "\n"
        + normalise(payload.address.full_address)
    )
    return hashlib.sha256(value.encode("utf-8")).hexdigest()

def find_existing_restaurants(database: Database, query: str) -> list[dict]:
    records = database["restaurants"].find(
        {
            "visibility_status": "active",
            "name": {"$regex": re.escape(query.strip()), "$options": "i"},
        },
        {"name": 1, "address.full_address": 1},
    ).sort("name", 1).limit(8)

    return [
        {
            "id": str(record["_id"]),
            "name": record["name"],
            "full_address": record.get("address", {}).get(
                "full_address", ""
            ),
        }
        for record in records
    ]

def reject_known_duplicate(
    database: Database,
    payload: RestaurantSubmissionInput,
) -> None:
    pattern = name_pattern(payload.name)
    address = normalise(payload.address.full_address)

    # Name matching finds candidates; an equal normalised full address
    # is required before blocking them here.
    restaurants = database["restaurants"].find(
        {
            "visibility_status": "active",
            "name": {"$regex": pattern, "$options": "i"},
        },
        {"address.full_address": 1},
    )

    for restaurant in restaurants:
        stored_address = restaurant.get("address", {}).get(
            "full_address", ""
        )

        if normalise(stored_address) == address:
            raise DuplicateSubmission(
                "A matching restaurant already exists on SeekMakan. "
                "Open its listing instead of submitting it again."
            )

    submissions = database["restaurant_submissions"].find(
        {
            "status": {"$in": ["pending", "changes_requested"]},
            "restaurant.name": {
                "$regex": pattern,
                "$options": "i",
            },
        },
        {"restaurant.address.full_address": 1},
    )

    for submission in submissions:
        stored_address = (
            submission.get("restaurant", {})
            .get("address", {})
            .get("full_address", "")
        )

        if normalise(stored_address) == address:
            raise DuplicateSubmission(
                "A matching restaurant submission is already awaiting review."
            )