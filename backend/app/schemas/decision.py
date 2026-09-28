from typing import Literal

from pydantic import BaseModel, ConfigDict, Field

from app.models.enums import PriceRange
from app.schemas.restaurant import RestaurantResponse

class DecisionRequest(BaseModel):
    model_config = ConfigDict(extra="forbid")

    source: Literal["nearby", "hidden_gems"] = "nearby"

    latitude: float = Field(ge=-90, le=90)
    longitude: float = Field(ge=-180, le=180)
    radius_km: float = Field(gt=0, le=50)

    search: str = Field(default="", max_length=100)
    cuisines: list[str] = Field(default_factory=list)
    food_categories: list[str] = Field(default_factory=list)
    price_range: PriceRange | None = None
    min_rating: float | None = Field(default=None, ge=0, le=5)
    open_now: bool = False

class DecisionCandidates(BaseModel):
    items: list[RestaurantResponse]
    total: int = Field(ge=0)