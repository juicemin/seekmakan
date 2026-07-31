from pymongo.database import Database
from app.repositories.restaurant_repository import (
    create_restaurant,
    get_restaurant,
    list_restaurants,
)

def browse_restaurants(
    database: Database,
    limit: int,
) -> list[dict]:
    return list_restaurants(database, limit)

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