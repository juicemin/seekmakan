from typing import Annotated
from pydantic import BaseModel, ConfigDict, Field, StringConstraints
from app.models.enums import PriceRange
from app.schemas.restaurant import (
    Address,
    DailyOperatingHours,
    GeoLocation,
    Weekday,
)

Tag = Annotated[
    str,
    StringConstraints(
        strip_whitespace=True,
        min_length=1,
        max_length=100,
    ),
]

class SubmissionAddress(Address):
    model_config = ConfigDict(
        extra="forbid",
        str_strip_whitespace=True,
    )

class SubmissionLocation(GeoLocation):
    model_config = ConfigDict(extra="forbid")


class SubmissionHours(DailyOperatingHours):
    model_config = ConfigDict(extra="forbid")

class RestaurantSubmissionInput(BaseModel):
    model_config = ConfigDict(
        extra="forbid",
        str_strip_whitespace=True,
    )

    name: str = Field(min_length=2, max_length=100)
    description: str | None = Field(default=None, max_length=1000)
    address: SubmissionAddress
    location: SubmissionLocation

    cuisines: list[Tag] = Field(default_factory=list, max_length=20)
    food_categories: list[Tag] = Field(
        default_factory=list,
        max_length=50,
    )

    price_range: PriceRange | None = None

    operating_hours: dict[Weekday, SubmissionHours] = Field(
        default_factory=dict,
    )