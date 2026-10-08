from datetime import datetime, timezone
from bson import ObjectId
from pymongo.database import Database
from pymongo.read_concern import ReadConcern
from pymongo.write_concern import WriteConcern
from app.schemas.review import ReviewInput

class RestaurantUnavailable(Exception):
    pass

class ReviewRestricted(Exception):
    pass

def create_review_indexes(database: Database) -> None:
    database["reviews"].create_index(
        [("restaurant_id", 1), ("user_id", 1)],
        unique=True,
        name="one_review_per_user_restaurant",
    )

    database["reviews"].create_index(
        [
            ("restaurant_id", 1),
            ("visibility_status", 1),
            ("created_at", -1),
            ("_id", -1),
        ],
        name="restaurant_visible_reviews",
    )

def serialize_review(document: dict) -> dict:
    def utc(value: datetime) -> datetime:
        # PyMongo returns naive UTC datetimes by default.
        if value.tzinfo is None:
            return value.replace(tzinfo=timezone.utc)
        return value

    return {
        "id": str(document["_id"]),
        "display_name": document["display_name"],
        "rating": document["rating"],
        "comment": document["comment"],
        "visibility_status": document["visibility_status"],
        "created_at": utc(document["created_at"]),
        "updated_at": utc(document["updated_at"]),
    }

def require_restaurant(
    database: Database,
    restaurant_id: ObjectId,
) -> None:
    restaurant = database["restaurants"].find_one(
        {"_id": restaurant_id, "visibility_status": "active"},
        {"_id": 1},
    )

    if restaurant is None:
        raise RestaurantUnavailable()

def list_reviews(
    database: Database,
    restaurant_id: ObjectId,
    page: int,
    page_size: int,
) -> dict:
    require_restaurant(database, restaurant_id)

    query = {
        "restaurant_id": restaurant_id,
        "visibility_status": "visible",
    }

    total = database["reviews"].count_documents(query)

    records = (
        database["reviews"]
        .find(query)
        .sort([("created_at", -1), ("_id", -1)])
        .skip((page - 1) * page_size)
        .limit(page_size)
    )

    return {
        "items": [serialize_review(record) for record in records],
        "page": page,
        "page_size": page_size,
        "total": total,
        "total_pages": (total + page_size - 1) // page_size,
    }

def get_own_review(
    database: Database,
    restaurant_id: ObjectId,
    user_id: ObjectId,
) -> dict | None:
    require_restaurant(database, restaurant_id)

    document = database["reviews"].find_one({
        "restaurant_id": restaurant_id,
        "user_id": user_id,
    })

    return serialize_review(document) if document else None

def change_own_review(
    database: Database,
    restaurant_id: ObjectId,
    user: dict,
    review: ReviewInput | None,
) -> dict:
    def transaction(session):
        now = datetime.now(timezone.utc)

        # Every review change first writes to the same restaurant.
        # Concurrent changes will conflict and be retried safely.
        restaurant_result = database["restaurants"].update_one(
            {
                "_id": restaurant_id,
                "visibility_status": "active",
            },
            {"$inc": {"review_revision": 1}},
            session=session,
        )

        if restaurant_result.matched_count == 0:
            raise RestaurantUnavailable()

        own_query = {
            "restaurant_id": restaurant_id,
            "user_id": user["_id"],
        }

        existing = database["reviews"].find_one(
            own_query,
            session=session,
        )

        if review is None:
            database["reviews"].delete_one(
                own_query,
                session=session,
            )
        else:
            # Editing must not republish a review hidden by moderation.
            if (
                existing is not None
                and existing.get("visibility_status") != "visible"
            ):
                raise ReviewRestricted()

            database["reviews"].update_one(
                own_query,
                {
                    "$set": {
                        "display_name": user["display_name"],
                        "rating": review.rating,
                        "comment": review.comment,
                        "updated_at": now,
                    },
                    "$setOnInsert": {
                        "created_at": now,
                        "visibility_status": "visible",
                    },
                },
                upsert=True,
                session=session,
            )

        totals = list(database["reviews"].aggregate(
            [
                {
                    "$match": {
                        "restaurant_id": restaurant_id,
                        "visibility_status": "visible",
                    }
                },
                {
                    "$group": {
                        "_id": None,
                        "review_count": {"$sum": 1},
                        "average_rating": {"$avg": "$rating"},
                    }
                },
            ],
            session=session,
        ))

        summary = {
            "review_count": totals[0]["review_count"] if totals else 0,
            "average_rating": (
                float(totals[0]["average_rating"]) if totals else 0.0
            ),
        }

        database["restaurants"].update_one(
            {"_id": restaurant_id},
            {
                "$set": {
                    **summary,
                    "updated_at": now,
                }
            },
            session=session,
        )

        return summary

    with database.client.start_session() as session:
        return session.with_transaction(
            transaction,
            read_concern=ReadConcern("snapshot"),
            write_concern=WriteConcern("majority"),
        )