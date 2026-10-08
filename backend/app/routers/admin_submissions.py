from fastapi import APIRouter, Depends, HTTPException, Query, Response
from pymongo.database import Database
from pymongo.errors import PyMongoError
from app.database import get_database
from app.repositories.submissions import serialize_submission
from app.services.admin import require_admin
from datetime import datetime, timezone
from typing import Literal
from bson import ObjectId
from pydantic import BaseModel, ConfigDict, Field, ValidationError
from app.schemas.restaurant import RestaurantCreate, GeoLocation
from app.services.sessions import require_browser_request

router = APIRouter(
    prefix="/api/admin/submissions",
    tags=["Admin submissions"],
    dependencies=[Depends(require_admin)],
)

@router.get("")
def list_pending_submissions(
    response: Response,
    page: int = Query(default=1, ge=1),
    database: Database = Depends(get_database),
    admin: dict = Depends(require_admin),
) -> dict:
    response.headers["Cache-Control"] = "no-store"
    page_size = 10
    query = {"status": "pending"}

    try:
        collection = database["restaurant_submissions"]
        total = collection.count_documents(query)

        records = (
            collection.find(query)
            .sort([("created_at", 1), ("_id", 1)])
            .skip((page - 1) * page_size)
            .limit(page_size)
        )

        return {
            "items": [
                {
                    **serialize_submission(record),
                    "is_own_submission": record["user_id"] == admin["_id"],
                }
                for record in records
            ],
            "page": page,
            "total": total,
            "total_pages": (total + page_size - 1) // page_size,
        }
    except PyMongoError:
        raise HTTPException(
            503, "Submissions could not be loaded. Please try again."
        ) from None

class ReviewDecision(BaseModel):
    model_config = ConfigDict(
        extra="forbid",
        str_strip_whitespace=True,
    )

    action: Literal["approve", "reject"]
    reason: str = Field(default="", max_length=500)


@router.post(
    "/{submission_id}/review",
    dependencies=[Depends(require_browser_request)],
)
def review_submission(
    submission_id: str,
    payload: ReviewDecision,
    response: Response,
    admin: dict = Depends(require_admin),
    database: Database = Depends(get_database),
) -> dict:
    response.headers["Cache-Control"] = "no-store"

    if not ObjectId.is_valid(submission_id):
        raise HTTPException(422, "Invalid submission ID.")

    if payload.action == "reject" and not payload.reason:
        raise HTTPException(422, "Enter a reason for rejection.")

    object_id = ObjectId(submission_id)

    def apply_review(session):
        submissions = database["restaurant_submissions"]
        submission = submissions.find_one(
            {"_id": object_id},
            session=session,
        )

        if submission is None:
            raise HTTPException(404, "Submission not found.")

        if submission["user_id"] == admin["_id"]:
            raise HTTPException(403, "You cannot review your own submission.")

        if submission["status"] != "pending":
            raise HTTPException(
                409, "This submission has already changed. Refresh the list."
            )

        now = datetime.now(timezone.utc)
        decision = (
            "approved" if payload.action == "approve" else "rejected"
        )

        # Claim this pending submission within the transaction.
        changed = submissions.update_one(
            {"_id": object_id, "status": "pending"},
            {
                "$set": {
                    "status": decision,
                    "updated_at": now,
                    "reviewed_at": now,
                    "reviewed_by": admin["_id"],
                    "review_reason": payload.reason,
                }
            },
            session=session,
        )

        if changed.modified_count != 1:
            raise HTTPException(409, "Submission changed. Refresh the list.")

        restaurant_id = None

        if payload.action == "approve":
            data = submission["restaurant"]

            if not data.get("location"):
                raise HTTPException(
                    422,
                    "Location must be confirmed before approval. "
                    "Leave this submission pending for now.",
                )

            try:
                restaurant = RestaurantCreate.model_validate({
                    **data,
                    "photos": [],
                    "verification_status": "verified",
                    "source": {"type": "manual"},
                }).model_dump(mode="json")
            except ValidationError:
                raise HTTPException(
                    422,
                    "Restaurant information is incomplete or invalid.",
                ) from None

            existing = database["restaurants"].find_one(
                {
                    "name": restaurant["name"],
                    "address.full_address": restaurant["address"]["full_address"],
                    "visibility_status": "active",
                },
                session=session,
            )

            if existing:
                raise HTTPException(
                    409, "An active restaurant with this name and address exists."
                )

            # Reusing the submission ID makes its published record traceable.
            restaurant_id = object_id
            database["restaurants"].insert_one(
                {
                    **restaurant,
                    "_id": restaurant_id,
                    "submission_id": object_id,
                    "submitted_by": submission["user_id"],
                    "verified_by": admin["_id"],
                    "verified_at": now,
                    "visibility_status": "active",
                    "average_rating": 0.0,
                    "review_count": 0,
                    "created_at": now,
                    "updated_at": now,
                },
                session=session,
            )

            submissions.update_one(
                {"_id": object_id},
                {"$set": {"restaurant_id": restaurant_id}},
                session=session,
            )

        return {
            "message": (
                "Restaurant approved and published."
                if restaurant_id
                else "Submission rejected."
            ),
            "restaurant_id": str(restaurant_id) if restaurant_id else None,
        }

    try:
        with database.client.start_session() as session:
            return session.with_transaction(apply_review)
    except PyMongoError:
        raise HTTPException(
            503,
            "Review could not be confirmed. Refresh before trying again.",
        ) from None

class LocationConfirmation(BaseModel):
    model_config = ConfigDict(
        extra="forbid",
        str_strip_whitespace=True,
    )

    location: GeoLocation
    note: str = Field(min_length=5, max_length=500)


@router.post(
    "/{submission_id}/location",
    dependencies=[Depends(require_browser_request)],
)
def confirm_submission_location(
    submission_id: str,
    payload: LocationConfirmation,
    response: Response,
    admin: dict = Depends(require_admin),
    database: Database = Depends(get_database),
) -> dict:
    response.headers["Cache-Control"] = "no-store"

    if not ObjectId.is_valid(submission_id):
        raise HTTPException(422, "Invalid submission ID.")

    now = datetime.now(timezone.utc)

    try:
        result = database["restaurant_submissions"].update_one(
            {
                "_id": ObjectId(submission_id),
                "status": "pending",
                "user_id": {"$ne": admin["_id"]},
                "restaurant.location": None,
            },
            {
                "$set": {
                    "restaurant.location": payload.location.model_dump(),
                    "updated_at": now,
                    "location_confirmation": {
                        "admin_id": admin["_id"],
                        "confirmed_at": now,
                        "note": payload.note,
                    },
                }
            },
        )
    except PyMongoError:
        raise HTTPException(
            503,
            "Location save could not be confirmed. Refresh before retrying.",
        ) from None

    if result.modified_count != 1:
        raise HTTPException(
            409,
            "Submission is unavailable, belongs to you, or already has "
            "a location. Refresh the list.",
        )

    return {"message": "Location saved. Review the submission before approval."}