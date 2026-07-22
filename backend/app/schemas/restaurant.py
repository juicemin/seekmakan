from datetime import datetime, timezone
from typing import Literal
from pydantic import BaseModel, Field

class GeoLocation(BaseModel):
    type: Literal["Point"] = "Point"
    coordinates: list[float] = Field(
        min_length = 2,
        max_length = 2,
        description = "[longtitude, latitude]",
    )

class RestaurantCreate(BaseModel):
    name: str = Field(min_length = 2, max_length = 100)
    description: str | None = None
    address: str
    location: GeoLocation
    cuisines: list[str] = []
    food_categories: list[str] = []
    price_range: str | None = None
    operating_hours: dict[str, str] = {}
    verification_status: str = "seeded"
    source: str = "manual"

class RestaurantResponse(RestaurantCreate):
    id: str
    average_rating: float = 0.0
    created_at: datetime
    updated_at: datetime

def current_utc_time() -> datetime:
    return datetime.now(timezone.utc)