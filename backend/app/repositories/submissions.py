from datetime import datetime, timezone
from bson import ObjectId
from pymongo.database import Database
from app.schemas.submission import RestaurantSubmissionInput
from app.repositories.submission_duplicates import (
    duplicate_key,
    reject_known_duplicate,
)

def create_submission_indexes(database: Database) -> None:
    database["restaurant_submissions"].create_index(
        [
            ("user_id", 1),
            ("created_at", -1),
            ("_id", -1),
        ],
        name="user_submissions_newest",
    )

    database["restaurant_submissions"].create_index(
        "duplicate_key",
        unique=True,
        name="unique_pending_submission_key",
        partialFilterExpression={
            "status": "pending",
            "duplicate_key": {"$type": "string"},
        },
    )

def serialize_submission(document: dict) -> dict:
    def utc(value: datetime) -> datetime:
        if value.tzinfo is None:
            return value.replace(tzinfo=timezone.utc)
        return value

    return {
        "id": str(document["_id"]),
        "restaurant": document["restaurant"],
        "status": document["status"],
        "created_at": utc(document["created_at"]),
        "updated_at": utc(document["updated_at"]),
        "photos": [
            {
                "id": photo["id"],
                "kind": photo["kind"],
                "url": photo["url"],
            }
            for photo in document.get("photos", [])
        ],
    }

def create_submission(
    database: Database,
    user_id: ObjectId,
    payload: RestaurantSubmissionInput,
) -> dict:
    reject_known_duplicate(database, payload)
    now = datetime.now(timezone.utc)

    document = {
        "user_id": user_id,
        "restaurant": payload.model_dump(mode="json"),
        "status": "pending",
        "created_at": now,
        "updated_at": now,
        "duplicate_key": duplicate_key(payload),
    }

    result = database["restaurant_submissions"].insert_one(document)
    document["_id"] = result.inserted_id

    return serialize_submission(document)

def list_own_submissions(
    database: Database,
    user_id: ObjectId,
    page: int,
    page_size: int,
) -> dict:
    query = {"user_id": user_id}
    collection = database["restaurant_submissions"]

    total = collection.count_documents(query)

    documents = (
        collection.find(query)
        .sort([("created_at", -1), ("_id", -1)])
        .skip((page - 1) * page_size)
        .limit(page_size)
    )

    return {
        "items": [
            serialize_submission(document)
            for document in documents
        ],
        "page": page,
        "page_size": page_size,
        "total": total,
        "total_pages": (total + page_size - 1) // page_size,
    }

def withdraw_submission(
    database: Database,
    submission_id: ObjectId,
    user_id: ObjectId,
) -> bool:
    result = database["restaurant_submissions"].update_one(
        {
            "_id": submission_id,
            "user_id": user_id,
            "status": {"$in": ["pending", "changes_requested"]},
        },
        {
            "$set": {
                "status": "withdrawn",
                "updated_at": datetime.now(timezone.utc),
            }
        },
    )

    return result.modified_count == 1