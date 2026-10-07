from typing import Annotated

from pydantic import (
    BaseModel,
    ConfigDict,
    Field,
    StringConstraints,
)

from app.models.enums import PriceRange

PreferenceText = Annotated[
    str,
    StringConstraints(strip_whitespace=True, min_length=1, max_length=100),
]

DisplayName = Annotated[
    str,
    StringConstraints(strip_whitespace=True, min_length=1, max_length=80),
]

class UserPreferences(BaseModel):
    model_config = ConfigDict(extra="forbid")

    cuisines: list[PreferenceText] = Field(default_factory=list, max_length=30)
    food_categories: list[PreferenceText] = Field(
        default_factory=list,
        max_length=50,
    )
    price_ranges: list[PriceRange] = Field(default_factory=list, max_length=3)

class ProfileUpdate(BaseModel):
    model_config = ConfigDict(extra="forbid")

    display_name: DisplayName
    preferences: UserPreferences