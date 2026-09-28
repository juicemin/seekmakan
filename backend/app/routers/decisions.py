from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException
from pymongo.database import Database

from app.database import get_database
from app.schemas.decision import DecisionCandidates, DecisionRequest
from app.services.decision_service import (
    TooManyCandidatesError,
    get_decision_candidates,
)

router = APIRouter(
    prefix="/api/decisions",
    tags=["Decide For Me"],
)

DatabaseDependency = Annotated[Database, Depends(get_database)]

@router.post("/candidates", response_model=DecisionCandidates)
def retrieve_decision_candidates(
    payload: DecisionRequest,
    database: DatabaseDependency,
) -> dict:
    try:
        return get_decision_candidates(database, payload)
    except TooManyCandidatesError as error:
        raise HTTPException(
            status_code=422,
            detail=str(error),
        ) from error