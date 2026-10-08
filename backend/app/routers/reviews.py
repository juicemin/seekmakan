from bson import ObjectId
from fastapi import APIRouter, Depends, HTTPException, Query, Response
from pymongo.database import Database
from pymongo.errors import DuplicateKeyError, PyMongoError
from app.database import get_database
from app.repositories.reviews import (
    RestaurantUnavailable,
    ReviewRestricted,
    change_own_review,
    get_own_review,
    list_reviews,
)
from app.schemas.review import ReviewInput
from app.services.sessions import (
    get_current_user,
    require_browser_request,
)

router = APIRouter(
    prefix="/api/restaurants",
    tags=["Reviews"],
)

def parse_id(value: str) -> ObjectId:
    if not ObjectId.is_valid(value):
        raise HTTPException(
            status_code=422,
            detail="Invalid restaurant ID.",
        )

    return ObjectId(value)

def run_review_operation(operation):
    try:
        return operation()
    except RestaurantUnavailable:
        raise HTTPException(
            status_code=404,
            detail="This restaurant is unavailable.",
        ) from None
    except ReviewRestricted:
        raise HTTPException(
            status_code=409,
            detail="This review is hidden and cannot be edited.",
        ) from None
    except DuplicateKeyError:
        raise HTTPException(
            status_code=409,
            detail="Your review changed. Refresh and try again.",
        ) from None
    except PyMongoError:
        raise HTTPException(
            status_code=503,
            detail=(
                "The review service is temporarily unavailable. "
                "Refresh to check your review before retrying."
            ),
        ) from None

@router.get("/{restaurant_id}/reviews")
def retrieve_reviews(
    restaurant_id: str,
    response: Response,
    page: int = Query(default=1, ge=1),
    page_size: int = Query(default=10, ge=1, le=50),
    database: Database = Depends(get_database),
) -> dict:
    response.headers["Cache-Control"] = "no-store"
    object_id = parse_id(restaurant_id)

    return run_review_operation(
        lambda: list_reviews(database, object_id, page, page_size)
    )

@router.get("/{restaurant_id}/reviews/mine")
def retrieve_own_review(
    restaurant_id: str,
    response: Response,
    user: dict = Depends(get_current_user),
    database: Database = Depends(get_database),
) -> dict:
    response.headers["Cache-Control"] = "no-store"
    object_id = parse_id(restaurant_id)

    review = run_review_operation(
        lambda: get_own_review(database, object_id, user["_id"])
    )

    return {"review": review}

@router.put(
    "/{restaurant_id}/reviews/mine",
    dependencies=[Depends(require_browser_request)],
)
def save_own_review(
    restaurant_id: str,
    payload: ReviewInput,
    response: Response,
    user: dict = Depends(get_current_user),
    database: Database = Depends(get_database),
) -> dict:
    response.headers["Cache-Control"] = "no-store"
    object_id = parse_id(restaurant_id)

    summary = run_review_operation(
        lambda: change_own_review(database, object_id, user, payload)
    )

    return {"message": "Review saved.", **summary}

@router.delete(
    "/{restaurant_id}/reviews/mine",
    dependencies=[Depends(require_browser_request)],
)
def delete_own_review(
    restaurant_id: str,
    response: Response,
    user: dict = Depends(get_current_user),
    database: Database = Depends(get_database),
) -> dict:
    response.headers["Cache-Control"] = "no-store"
    object_id = parse_id(restaurant_id)

    summary = run_review_operation(
        lambda: change_own_review(database, object_id, user, None)
    )

    return {"message": "Review removed.", **summary}