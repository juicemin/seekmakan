from typing import Annotated
from fastapi import APIRouter, Depends, HTTPException, Query, status
from pymongo.database import Database
from app.database import get_database
from app.models.enums import PriceRange

from app.schemas.restaurant import (
    RestaurantCreate,
    RestaurantFilterOptions,
    RestaurantPage,
    RestaurantResponse,
)

from app.services.restaurant_service import (
    add_restaurant,
    browse_restaurants,
    browse_restaurant_filter_options,
    find_restaurant,
)

router = APIRouter(
    prefix="/api/restaurants",
    tags=["Restaurants"],
)

DatabaseDependency = Annotated[Database, Depends(get_database)]

@router.get("", response_model=RestaurantPage)
def retrieve_restaurants(
    database: DatabaseDependency,
    page: int = Query(default=1, ge=1),
    page_size: int = Query(default=20, ge=1, le=100),
    search: str = Query(default="", max_length=100),
    cuisines: list[str] = Query(default=[]),
    food_categories: list[str] = Query(default=[]),
    price_range: PriceRange | None = Query(default=None),
    min_rating: float | None = Query(default=None, ge=0, le=5),
    latitude: float | None = Query(default=None, ge=-90, le=90),
    longitude: float | None = Query(default=None, ge=-180, le=180),
    radius_km: float | None = Query(default=None, gt=0, le=50),
) -> dict:
    location_values = (latitude, longitude, radius_km)

    if (
        any(value is not None for value in location_values)
        and not all(value is not None for value in location_values)
    ):
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail="Provide latitude, longitude, and radius_km together.",
        )
    
    return browse_restaurants(
        database,
        page,
        page_size,
        search,
        cuisines,
        food_categories,
        price_range=price_range.value if price_range is not None else None,
        min_rating=min_rating,
        latitude=latitude,
        longitude=longitude,
        radius_km=radius_km,     
    )

@router.get(
    "/filter-options",
    response_model=RestaurantFilterOptions,
)
def retrieve_restaurant_filter_options(
    database: DatabaseDependency,
) -> dict[str, list[str]]:
    return browse_restaurant_filter_options(database)

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
