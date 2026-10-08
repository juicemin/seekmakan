from typing import Annotated
from pydantic import BaseModel, ConfigDict, Field, StringConstraints

ReviewText = Annotated[
    str,
    StringConstraints(
        strip_whitespace=True,
        min_length=1,
        max_length=1000,
    ),
]

class ReviewInput(BaseModel):
    model_config = ConfigDict(extra="forbid")

    rating: int = Field(strict=True, ge=1, le=5)
    comment: ReviewText