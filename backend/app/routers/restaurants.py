from typing import Annotated
from fastapi import APIRouter, Depends, HTTPException, Query, status
from pymongo.database import Database
from app.database import get_database

from app.schemas.restaurant import (
    RestaurantCreate,
    RestaurantResponse,
)

from app.services.restaurant_service import (
    add_restaurant,
    browse_restaurants,
    find_restaurant,
)

router = APIRouter(
    prefix="/api/restaurants",
    tags=["Restaurants"],
)

DatabaseDependency = Annotated[Database, Depends(get_database)]

@router.get("", response_model=list[RestaurantResponse])
def retrieve_restaurants(
    database: DatabaseDependency,
    limit: int = Query(default=20, ge=1, le=100),
) -> list[dict]:
    return browse_restaurants(database, limit)

@router.get(
    "/{restaurant_id}",
    response_model=RestaurantResponse,
)
def retrieve_restaurant(
    restaurant_id: str,
    database: DatabaseDependency,
) -> dict:
    restaurant = find_restaurant(database, restaurant_id)

    if restaurant is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Restaurant not found",
        )

    return restaurant

#temporary endpoint for creating restaurants (POST endpoint is for admin only)
@router.post(
    "",
    response_model=RestaurantResponse,
    status_code=status.HTTP_201_CREATED,
)
def create_new_restaurant(
    payload: RestaurantCreate,
    database: DatabaseDependency,
) -> dict:
    return add_restaurant(
        database,
        payload.model_dump(),
    )