from pymongo.database import Database

from app.repositories.restaurant_repository import list_restaurants
from app.schemas.decision import DecisionRequest

MAX_CANDIDATES = 500

class TooManyCandidatesError(ValueError):
    pass

def get_decision_candidates(
    database: Database,
    request: DecisionRequest,
) -> dict:
    items, total = list_restaurants(
        database,
        page=1,
        page_size=MAX_CANDIDATES + 1,
        search=request.search.strip(),
        cuisines=[
            value.strip()
            for value in request.cuisines
            if value.strip()
        ],
        food_categories=[
            value.strip()
            for value in request.food_categories
            if value.strip()
        ],
        price_range=(
            request.price_range.value
            if request.price_range is not None
            else None
        ),
        min_rating=request.min_rating,
        latitude=request.latitude,
        longitude=request.longitude,
        radius_km=request.radius_km,
        open_now=request.open_now,
        hidden_gems=request.source == "hidden_gems",
    )

    if total > MAX_CANDIDATES or len(items) > MAX_CANDIDATES:
        raise TooManyCandidatesError(
            "Too many matching restaurants. "
            "Reduce the distance or add filters."
        )

    return {
        "items": items,
        "total": len(items),
    }

def get_food_decision_candidates(
    database: Database,
    request: DecisionRequest,
) -> dict:
    restaurant_result = get_decision_candidates(database, request)

    categories = {
        category
        for restaurant in restaurant_result["items"]
        for category in restaurant.get("food_categories", [])
        if isinstance(category, str) and category.strip()
    }

    items = sorted(
        categories,
        key=lambda category: (category.casefold(), category),
    )

    return {
        "items": items,
        "total": len(items),
    }
