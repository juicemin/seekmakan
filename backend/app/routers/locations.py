from fastapi import APIRouter, HTTPException, Query

from app.schemas.location import LocationSearchResponse
from app.services.location_service import (
    LocationSearchError,
    search_locations,
)

router = APIRouter(
    prefix="/api/locations",
    tags=["Locations"],
)

@router.get("/search", response_model=LocationSearchResponse)
def search_location(
    q: str = Query(min_length=3, max_length=150),
) -> dict:
    try:
        return {"items": search_locations(q)}
    except LocationSearchError as error:
        raise HTTPException(
            status_code=error.status_code,
            detail=str(error),
        ) from None