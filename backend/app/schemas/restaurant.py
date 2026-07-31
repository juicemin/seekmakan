from datetime import datetime, timezone
from typing import Literal
from pydantic import BaseModel, Field, field_validator

from app.models.enums import (
    PriceRange,
    SourceType,
    VerificationStatus,
    VisibilityStatus,
)

class Address(BaseModel):
    full_address: str = Field(min_length=5, max_length=300)
    city: str = Field(min_length=2, max_length=100)
    state: str = Field(min_length=2, max_length=100)
    postcode: str | None = Field(
        default=None,
        min_length=5,
        max_length=10,
    )

class GeoLocation(BaseModel):
    type: Literal["Point"] = "Point"
    coordinates: list[float] = Field(
        min_length=2,
        max_length=2,
        description="[longitude, latitude]",
    )

    @field_validator("coordinates")
    @classmethod
    def validate_coordinates(
        cls,
        coordinates: list[float],
    ) -> list[float]:
        longitude, latitude = coordinates

        if not -180 <= longitude <= 180:
            raise ValueError(
                "Longitude must be between -180 and 180"
            )

        if not -90 <= latitude <= 90:
            raise ValueError(
                "Latitude must be between -90 and 90"
            )

        return coordinates

class DailyOperatingHours(BaseModel):
    open: str
    close: str

class RestaurantSource(BaseModel):
    type: SourceType = SourceType.MANUAL
    external_id: str | None = None
    last_checked_at: datetime | None = None

class RestaurantBase(BaseModel):
    name: str = Field(min_length=2, max_length=100)
    description: str | None = Field(
        default=None,
        max_length=1000,
    )
    address: Address
    location: GeoLocation
    cuisines: list[str] = Field(default_factory=list)
    food_categories: list[str] = Field(default_factory=list)
    price_range: PriceRange | None = None
    operating_hours: dict[str, DailyOperatingHours] = Field(
        default_factory=dict
    )
    verification_status: VerificationStatus = (
        VerificationStatus.SEEDED
    )
    source: RestaurantSource = Field(
        default_factory=RestaurantSource
    )

class RestaurantCreate(RestaurantBase):
    pass

class RestaurantResponse(RestaurantBase):
    id: str
    visibility_status: VisibilityStatus
    average_rating: float = 0.0
    review_count: int = 0
    created_at: datetime
    updated_at: datetime

def current_utc_time() -> datetime:
    return datetime.now(timezone.utc)