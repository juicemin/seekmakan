from datetime import datetime, timezone
from typing import Any
from bson import ObjectId
from pymongo.database import Database
from app.repositories.opening_hours import (
    build_open_now_query,
    calculate_opening_status,
)
import re

def get_restaurant_collection(database: Database):
    return database["restaurants"]

def serialize_restaurant(
    document: dict[str, Any],
    *,
    now: datetime | None = None,
) -> dict[str, Any]:
    checked_at = now if now is not None else datetime.now(timezone.utc)

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
        "opening_status": calculate_opening_status(
            document.get("operating_hours", {}),
            checked_at,
        ),
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
    page: int = 1,
    page_size: int = 20,
    search: str = "",
    cuisines: list[str] | None = None,
    food_categories: list[str] | None = None,
    price_range: str | None = None,
    min_rating: float | None = None,
    latitude: float | None = None,
    longitude: float | None = None,
    radius_km: float | None = None,
    open_now: bool = False,
) -> tuple[list[dict[str, Any]], int]:
    collection = get_restaurant_collection(database)
    checked_at = datetime.now(timezone.utc)

    query: dict[str, Any] = {
        "visibility_status": "active",
    }
    if cuisines:
        query["cuisines"] = {"$in": cuisines}

    if food_categories:
        query["food_categories"] = {"$in": food_categories}

    if search:
        pattern = re.escape(search)

        query["$or"] = [
            {"name": {"$regex": pattern, "$options": "i"}},
            {"cuisines": {"$regex": pattern, "$options": "i"}},
            {"food_categories": {"$regex": pattern, "$options": "i"}},
        ]

    if price_range is not None:
        query["price_range"] = price_range

    if min_rating is not None:
        query["average_rating"] = {"$gte": min_rating}
        query["review_count"] = {"$gt": 0}

    if (
        latitude is not None
        and longitude is not None
        and radius_km is not None
    ):
        earth_radius_km = 6371.0

        query["location"] = {
            "$geoWithin": {
                "$centerSphere": [
                    [longitude, latitude],
                    radius_km / earth_radius_km,
                ]
            }
        }

    if open_now:
        query = {
            "$and": [
                query,
                build_open_now_query(checked_at),
            ]
        }

    total = collection.count_documents(query)

    cursor = (
        collection
        .find(query)
        .sort("_id", 1)
        .skip((page - 1) * page_size)
        .limit(page_size)
    )

    return [
        serialize_restaurant(document, now=checked_at)
        for document in cursor
    ], total

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

def get_restaurant_filter_options(
    database: Database,
) -> dict[str, list[str]]:
    collection = get_restaurant_collection(database)
    query = {"visibility_status": "active"}

    cuisines = collection.distinct("cuisines", query)
    food_categories = collection.distinct("food_categories", query)

    return {
        "cuisines": sorted(
            [
                value
                for value in cuisines
                if isinstance(value, str) and value.strip()
            ],
            key=str.casefold,
        ),
        "food_categories": sorted(
            [
                value
                for value in food_categories
                if isinstance(value, str) and value.strip()
            ],
            key=str.casefold,
        ),
    }