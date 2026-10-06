from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException
from pymongo.database import Database

from app.database import get_database
from app.schemas.decision import (
    DecisionCandidates, 
    DecisionRequest, 
    FoodDecisionCandidates,
)
from app.services.decision_service import (
    TooManyCandidatesError,
    get_decision_candidates,
    get_food_decision_candidates,
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

@router.post("/food-candidates", response_model=FoodDecisionCandidates)
def retrieve_food_decision_candidates(
    payload: DecisionRequest,
    database: DatabaseDependency,
) -> dict:
    try:
        return get_food_decision_candidates(database, payload)
    except TooManyCandidatesError as error:
        raise HTTPException(
            status_code=422,
            detail=str(error),
        ) from error