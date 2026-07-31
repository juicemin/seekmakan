from datetime import datetime, timezone
from typing import Any
from bson import ObjectId
from pymongo.database import Database

def get_restaurant_collection(database: Database):
    return database["restaurants"]

def serialize_restaurant(document: dict[str, Any]) -> dict[str, Any]:
    return {
        "id": str(document["_id"]),
        "name": document["name"],
        "description": document.get("description"),
        "address": document["address"],
        "location": document["location"],
        "cuisines": document.get("cuisines", []),
        "food_categories": document.get("food_categories", []),
        "price_range": document.get("price_range"),
        "operating_hours": document.get("operating_hours", {}),
        "verification_status": document.get(
            "verification_status",
            "seeded",
        ),
        "visibility_status": document.get(
            "visibility_status",
            "active",
        ),
        "source": document.get("source", {"type": "manual"}),
        "average_rating": document.get("average_rating", 0.0),
        "review_count": document.get("review_count", 0),
        "created_at": document["created_at"],
        "updated_at": document["updated_at"],
    }

def create_restaurant(
    database: Database,
    data: dict[str, Any],
) -> dict[str, Any]:
    collection = get_restaurant_collection(database)
    now = datetime.now(timezone.utc)

    document = {
        **data,
        "average_rating": 0.0,
        "review_count": 0,
        "visibility_status": "active",
        "created_at": now,
        "updated_at": now,
    }

    result = collection.insert_one(document)
    document["_id"] = result.inserted_id

    return serialize_restaurant(document)

def list_restaurants(
    database: Database,
    limit: int = 20,
) -> list[dict[str, Any]]:
    collection = get_restaurant_collection(database)

    cursor = (
        collection
        .find({"visibility_status": "active"})
        .limit(limit)
    )

    return [
        serialize_restaurant(document)
        for document in cursor
    ]

def get_restaurant(
    database: Database,
    restaurant_id: str,
) -> dict[str, Any] | None:
    if not ObjectId.is_valid(restaurant_id):
        return None

    collection = get_restaurant_collection(database)

    document = collection.find_one(
        {
            "_id": ObjectId(restaurant_id),
            "visibility_status": "active",
        }
    )

    if document is None:
        return None

    return serialize_restaurant(document)