from pydantic import BaseModel, Field

class LocationResult(BaseModel):
    label: str
    latitude: float = Field(ge=-90, le=90)
    longitude: float = Field(ge=-180, le=180)
    city: str = ""
    state: str = ""
    postcode: str = ""

class LocationSearchResponse(BaseModel):
    items: list[LocationResult]