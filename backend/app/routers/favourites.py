from bson import ObjectId
from fastapi import APIRouter, Depends, HTTPException, Query, Response
from pymongo.database import Database
from pymongo.errors import PyMongoError
from app.database import get_database
from app.repositories.favourites import (
    list_restaurant_favourites,
    remove_restaurant_favourite,
    save_restaurant_favourite,
)
from app.services.sessions import (
    get_current_user,
    require_browser_request,
)
from fastapi import Request
from app.repositories.favourites import (
    list_food_favourites,
    change_food_favourite,
)

router = APIRouter(
    prefix="/api/favourites",
    tags=["Favourites"],
)

def parse_restaurant_id(value: str) -> ObjectId:
    if not ObjectId.is_valid(value):
        raise HTTPException(
            status_code=422,
            detail="Invalid restaurant ID.",
        )

    return ObjectId(value)

@router.get("/restaurants")
def retrieve_favourites(
    response: Response,
    page: int = Query(default=1, ge=1),
    page_size: int = Query(default=20, ge=1, le=50),
    user: dict = Depends(get_current_user),
    database: Database = Depends(get_database),
) -> dict:
    response.headers["Cache-Control"] = "no-store"

    try:
        return list_restaurant_favourites(
            database,
            user["_id"],
            page,
            page_size,
        )
    except PyMongoError:
        raise HTTPException(
            status_code=503,
            detail="Your favourites could not be loaded.",
        ) from None

@router.put(
    "/restaurants/{restaurant_id}",
    dependencies=[Depends(require_browser_request)],
)
def add_favourite(
    restaurant_id: str,
    response: Response,
    user: dict = Depends(get_current_user),
    database: Database = Depends(get_database),
) -> dict:
    response.headers["Cache-Control"] = "no-store"
    object_id = parse_restaurant_id(restaurant_id)

    try:
        available = save_restaurant_favourite(
            database,
            user["_id"],
            object_id,
        )
    except PyMongoError:
        raise HTTPException(
            status_code=503,
            detail="This favourite could not be saved.",
        ) from None

    if not available:
        raise HTTPException(
            status_code=404,
            detail="This restaurant is unavailable.",
        )

    return {
        "restaurant_id": str(object_id),
        "saved": True,
    }

@router.delete(
    "/restaurants/{restaurant_id}",
    dependencies=[Depends(require_browser_request)],
)
def delete_favourite(
    restaurant_id: str,
    response: Response,
    user: dict = Depends(get_current_user),
    database: Database = Depends(get_database),
) -> dict:
    response.headers["Cache-Control"] = "no-store"
    object_id = parse_restaurant_id(restaurant_id)

    try:
        remove_restaurant_favourite(
            database,
            user["_id"],
            object_id,
        )
    except PyMongoError:
        raise HTTPException(
            status_code=503,
            detail="This favourite could not be removed.",
        ) from None

    return {
        "restaurant_id": str(object_id),
        "saved": False,
    }

@router.get("/restaurant-ids")
def retrieve_favourite_ids(
    response: Response,
    user: dict = Depends(get_current_user),
    database: Database = Depends(get_database),
) -> dict:
    response.headers["Cache-Control"] = "no-store"

    try:
        records = database["favourites"].find(
            {"user_id": user["_id"]},
            {"restaurant_id": 1, "_id": 0},
        )

        return {
            "restaurant_ids": [
                str(record["restaurant_id"])
                for record in records
            ]
        }
    except PyMongoError:
        raise HTTPException(
            status_code=503,
            detail="Your favourites could not be loaded.",
        ) from None

@router.get("/foods")
def retrieve_food_favourites(
    response: Response,
    user: dict = Depends(get_current_user),
    database: Database = Depends(get_database),
) -> dict:
    response.headers["Cache-Control"] = "no-store"

    try:
        return {"categories": list_food_favourites(database, user["_id"])}
    except PyMongoError:
        raise HTTPException(
            status_code=503,
            detail="Your food favourites could not be loaded.",
        ) from None

@router.put(
    "/foods",
    dependencies=[Depends(require_browser_request)],
)
@router.delete(
    "/foods",
    dependencies=[Depends(require_browser_request)],
)
def update_food_favourite(
    request: Request,
    response: Response,
    category: str = Query(min_length=1, max_length=100),
    user: dict = Depends(get_current_user),
    database: Database = Depends(get_database),
) -> dict:
    response.headers["Cache-Control"] = "no-store"
    category = category.strip()

    if not category:
        raise HTTPException(status_code=422, detail="Choose a food category.")

    saved = request.method == "PUT"

    try:
        available = change_food_favourite(
            database,
            user["_id"],
            category,
            saved,
        )
    except PyMongoError:
        raise HTTPException(
            status_code=503,
            detail="Your food favourite could not be updated.",
        ) from None

    if not available:
        raise HTTPException(
            status_code=404,
            detail="This food category is currently unavailable.",
        )

    return {"category": category, "saved": saved}