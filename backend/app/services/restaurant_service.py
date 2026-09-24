from pymongo.database import Database
from app.repositories.restaurant_repository import (
    create_restaurant,
    get_restaurant,
    get_restaurant_filter_options,
    list_restaurants,
)

def browse_restaurants(
    database: Database,
    page: int,
    page_size: int,
    search: str = "",
    cuisines: list[str] | None = None,
    food_categories: list[str] | None = None,
    price_range: str | None = None,
    min_rating: float | None = None,
    latitude: float | None = None,
    longitude: float | None = None,
    radius_km: float | None = None,
) -> dict:
    selected_cuisines = [
        value.strip()
        for value in (cuisines or [])
        if value.strip()
    ]

    selected_categories = [
        value.strip()
        for value in (food_categories or [])
        if value.strip()
    ]

    items, total = list_restaurants(
        database,
        page,
        page_size,
        search.strip(),
        selected_cuisines,
        selected_categories,
        price_range=price_range,
        min_rating=min_rating,
        latitude=latitude,
        longitude=longitude,
        radius_km=radius_km,
    )

    return {
        "items": items,
        "page": page,
        "page_size": page_size,
        "total": total,
        "total_pages": (total + page_size - 1) // page_size,
    }

def browse_restaurant_filter_options(
    database: Database,
) -> dict[str, list[str]]:
    return get_restaurant_filter_options(database)

def find_restaurant(
    database: Database,
    restaurant_id: str,
) -> dict | None:
    return get_restaurant(database, restaurant_id)

def add_restaurant(
    database: Database,
    restaurant_data: dict,
) -> dict:
    return create_restaurant(database, restaurant_data)
