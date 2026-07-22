from fastapi import APIRouter, HTTPException, Query, status

from app.repositories.restaurant_repository import (
    create_restaurant,
    get_restaurant,
    list_restaurants,
)

from app.schemas.restaurant import RestaurantCreate, RestaurantResponse

router = APIRouter(
    prefix = "/api/restaurants",
    tags = ["Restaurants"],
)

@router.get("", response_model = list[RestaurantResponse])
def retrieve_restaurants(
    limit: int = Query(default = 20, ge = 1, le = 100),
) -> list[dict]:
    return list_restaurants(limit = limit)

@router.get("/{restaurant_id}", response_model = RestaurantResponse)
def retrieve_restaurant(restaurant_id: str) -> dict:
    restaurant = get_restaurant(restaurant_id)

    if restaurant is None:
        raise HTTPException(
            status_code = status.HTTP_404_NOT_FOUND,
            detail = "Restaurant not found",
        )
    
    return restaurant

@router.post(
    "",
    response_model = RestaurantResponse,
    status_code = status.HTTP_201_CREATED,
)

def add_restaurant(payload: RestaurantCreate) -> dict:
    return create_restaurant(payload.model_dump())