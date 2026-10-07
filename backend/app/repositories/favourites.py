from datetime import datetime, timezone
from bson import ObjectId
from pymongo.database import Database
from pymongo.errors import DuplicateKeyError
from app.repositories.restaurant_repository import serialize_restaurant

def create_favourite_indexes(database: Database) -> None:
    database["favourites"].create_index(
        [("user_id", 1), ("restaurant_id", 1)],
        unique=True,
        name="unique_user_restaurant_favourite",
    )

    database["favourites"].create_index(
        [("user_id", 1), ("created_at", -1), ("_id", -1)],
        name="user_favourites_newest",
    )

    database["food_favourites"].create_index(
        [("user_id", 1), ("category", 1)],
        unique=True,
        name="unique_user_food_favourite",
    )

def save_restaurant_favourite(
    database: Database,
    user_id: ObjectId,
    restaurant_id: ObjectId,
) -> bool:
    restaurant = database["restaurants"].find_one(
        {
            "_id": restaurant_id,
            "visibility_status": "active",
        },
        {"_id": 1},
    )

    if restaurant is None:
        return False

    try:
        database["favourites"].update_one(
            {
                "user_id": user_id,
                "restaurant_id": restaurant_id,
            },
            {
                "$setOnInsert": {
                    "created_at": datetime.now(timezone.utc),
                }
            },
            upsert=True,
        )
    except DuplicateKeyError:
        # A simultaneous request may already have saved this favourite.
        pass

    return True

def remove_restaurant_favourite(
    database: Database,
    user_id: ObjectId,
    restaurant_id: ObjectId,
) -> None:
    database["favourites"].delete_one(
        {
            "user_id": user_id,
            "restaurant_id": restaurant_id,
        }
    )

def list_restaurant_favourites(
    database: Database,
    user_id: ObjectId,
    page: int,
    page_size: int,
) -> dict:
    query = {"user_id": user_id}
    collection = database["favourites"]

    total = collection.count_documents(query)

    records = list(
        collection.find(query)
        .sort([("created_at", -1), ("_id", -1)])
        .skip((page - 1) * page_size)
        .limit(page_size)
    )

    restaurant_ids = [record["restaurant_id"] for record in records]

    restaurants = {
        document["_id"]: document
        for document in database["restaurants"].find(
            {
                "_id": {"$in": restaurant_ids},
                "visibility_status": "active",
            }
        )
    }

    items = []

    for record in records:
        restaurant = restaurants.get(record["restaurant_id"])

        items.append(
            {
                "restaurant_id": str(record["restaurant_id"]),
                "saved_at": record["created_at"],
                "restaurant": (
                    serialize_restaurant(restaurant)
                    if restaurant is not None
                    else None
                ),
            }
        )

    return {
        "items": items,
        "page": page,
        "page_size": page_size,
        "total": total,
        "total_pages": (total + page_size - 1) // page_size,
    }

def list_food_favourites(
    database: Database,
    user_id: ObjectId,
) -> list[str]:
    records = database["food_favourites"].find(
        {"user_id": user_id},
        {"category": 1, "_id": 0},
    ).sort("category", 1)

    return [record["category"] for record in records]

def change_food_favourite(
    database: Database,
    user_id: ObjectId,
    category: str,
    saved: bool,
) -> bool:
    query = {
        "user_id": user_id,
        "category": category,
    }

    if not saved:
        database["food_favourites"].delete_one(query)
        return True

    available = database["restaurants"].find_one(
        {
            "visibility_status": "active",
            "food_categories": category,
        },
        {"_id": 1},
    )

    if available is None:
        return False

    try:
        database["food_favourites"].update_one(
            query,
            {
                "$setOnInsert": {
                    "created_at": datetime.now(timezone.utc),
                }
            },
            upsert=True,
        )
    except DuplicateKeyError:
        pass

    return True