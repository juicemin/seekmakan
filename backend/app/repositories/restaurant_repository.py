from datetime import datetime, timezone
from typing import Any
from bson import ObjectId
from pymongo.collection import Collection
from app.database import database

restaurant_collection: Collection = database["restaurants"]

def serialize_restaurant(document: dict[str, Any]) -> dict[str, Any]:
    return{
        "id": str(document["_id"]),
        "name": document["name"],
        "description": document.get("description"),
        "address": document["address"],
        "location": document["location"],
        "cuisines": document.get("cuisines", []),
        "food_categories": document.get("food_categories", []),
        "price_range": document.get("price_range"),
        "operating_hours": document.get("operating_hours", {}),
        "verification_status": document.get("verification_status", "seeded"),
        "source": document.get("source", "manual"),
        "average_rating": document.get("average_rating", 0.0),
        "created_at": document["created_at"],
        "updated_at": document["updated_at"],
    }

def create_restaurant(data: dict[str, Any]) -> dict[str, Any]:
    now = datetime.now(timezone.utc)

    document = {
        **data,
        "average_rating": 0.0,
        "created_at": now,
        "updated_at": now,
    }

    result = restaurant_collection.insert_one(document)
    document["_id"] = result.inserted_id

    return serialize_restaurant(document)

def list_restaurants(limit: int = 20) -> list[dict[str, Any]]:
    cursor = restaurant_collection.find().limit(limit)
    return[serialize_restaurant(document) for document in cursor]

def get_restaurant(restaurant_id: str) -> dict[str, Any] | None:
    if not ObjectId.is_valid(restaurant_id):
        return None
    
    document = restaurant_collection.find_one(
        {"_id": ObjectId(restaurant_id)}
    )

    if document is None:
        return None
    
    return serialize_restaurant(document)