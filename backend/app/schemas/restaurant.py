from datetime import datetime, timezone
from typing import Literal
from pydantic import BaseModel, Field, field_validator, model_validator

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
    status: Literal["open", "closed", "open_24_hours"] = "open"

    open: str | None = Field(
        default=None,
        pattern=r"^(?:[01][0-9]|2[0-3]):[0-5][0-9]$",
    )
    close: str | None = Field(
        default=None,
        pattern=r"^(?:[01][0-9]|2[0-3]):[0-5][0-9]$",
    )

    @model_validator(mode="after")
    def validate_hours(self) -> "DailyOperatingHours":
        if self.status == "open":
            if self.open is None or self.close is None:
                raise ValueError(
                    "Open days require both opening and closing times."
                )

            if self.open == self.close:
                raise ValueError(
                    "Opening and closing times must differ. "
                    "Use open_24_hours for all-day operation."
                )

        elif self.open is not None or self.close is not None:
            raise ValueError(
                "Closed and 24-hour days must not contain opening "
                "or closing times."
            )

        return self

class RestaurantSource(BaseModel):
    type: SourceType = SourceType.MANUAL
    external_id: str | None = None
    last_checked_at: datetime | None = None

Weekday = Literal[
    "monday",
    "tuesday",
    "wednesday",
    "thursday",
    "friday",
    "saturday",
    "sunday",
]

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
    operating_hours: dict[Weekday, DailyOperatingHours] = Field(
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
    opening_status: Literal["open", "closed", "unknown"] = "unknown"

class RestaurantPage(BaseModel):
    items: list[RestaurantResponse]
    page: int = Field(ge=1)
    page_size: int = Field(ge=1, le=100)
    total: int = Field(ge=0)
    total_pages: int = Field(ge=0)

class RestaurantFilterOptions(BaseModel):
    cuisines: list[str]
    food_categories: list[str]

def current_utc_time() -> datetime:
    return datetime.now(timezone.utc)
