from pymongo import ASCENDING, DESCENDING, GEOSPHERE
from pymongo.database import Database

def create_database_indexes(database: Database) -> None:
    restaurants = database["restaurants"]

    restaurants.create_index(
        [("location", GEOSPHERE)],
        name="restaurant_location_2dsphere",
    )

    restaurants.create_index(
        [("name", ASCENDING)],
        name="restaurant_name",
    )

    restaurants.create_index(
        [("cuisines", ASCENDING)],
        name="restaurant_cuisines",
    )

    restaurants.create_index(
        [("food_categories", ASCENDING)],
        name="restaurant_food_categories",
    )

    restaurants.create_index(
        [("price_range", ASCENDING)],
        name="restaurant_price_range",
    )

    restaurants.create_index(
        [("average_rating", DESCENDING)],
        name="restaurant_average_rating",
    )

    restaurants.create_index(
        [("visibility_status", ASCENDING)],
        name="restaurant_visibility_status",
    )