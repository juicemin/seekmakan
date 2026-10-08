from fastapi import APIRouter, Depends, HTTPException, Query, Response
from pymongo.database import Database
from pymongo.errors import DuplicateKeyError, PyMongoError
from app.database import get_database
from app.repositories.submissions import (
    create_submission,
    list_own_submissions,
)
from app.schemas.submission import RestaurantSubmissionInput
from app.services.sessions import (
    get_current_user,
    require_browser_request,
)
from app.services.restaurant_lookup import (
    RestaurantLookupError,
    search_restaurant_candidates,
)
from app.repositories.submission_duplicates import (
    DuplicateSubmission,
    find_existing_restaurants,
)
from bson import ObjectId
from app.repositories.submissions import withdraw_submission

router = APIRouter(
    prefix="/api/submissions",
    tags=["Community submissions"],
)

@router.get("/check-existing", dependencies=[Depends(get_current_user), Depends(require_browser_request)])
def check_existing_restaurant(
    response: Response,
    q: str = Query(min_length=2, max_length=100),
    database: Database = Depends(get_database),
) -> dict:
    response.headers["Cache-Control"] = "no-store"
    query = " ".join(q.split())
    if len(query) < 2:
        raise HTTPException(422, "Enter at least two characters.")
    try:
        return {"items": find_existing_restaurants(database, query)}
    except PyMongoError:
        raise HTTPException(503, "SeekMakan could not check existing restaurants. Try again.") from None


@router.get("/name-suggestions", dependencies=[Depends(get_current_user), Depends(require_browser_request)])
def suggest_restaurant_names(
    response: Response,
    q: str = Query(min_length=2, max_length=100),
) -> dict:
    response.headers["Cache-Control"] = "no-store"
    try:
        return {"items": search_restaurant_candidates(q)}
    except RestaurantLookupError as error:
        raise HTTPException(error.status_code, str(error)) from None


@router.post(
    "",
    status_code=201,
    dependencies=[Depends(require_browser_request)],
)
def submit_restaurant(
    payload: RestaurantSubmissionInput,
    response: Response,
    user: dict = Depends(get_current_user),
    database: Database = Depends(get_database),
) -> dict:
    response.headers["Cache-Control"] = "no-store"

    try:
        submission = create_submission(
            database,
            user["_id"],
            payload,
        )
    except DuplicateSubmission as error:
        raise HTTPException(
            status_code=409,
            detail=str(error),
        ) from None
    except DuplicateKeyError:
        raise HTTPException(
            status_code=409,
            detail="This restaurant already has a pending submission.",
        ) from None
    except PyMongoError:
        raise HTTPException(
            status_code=503,
            detail=(
                "Submission could not be confirmed. "
                "Check My submissions before trying again."
            ),
        ) from None

    return {
        "message": (
            "Your restaurant submission has been received. "
            "It is pending and is not published yet."
        ),
        "submission": submission,
    }

@router.get("/mine")
def retrieve_own_submissions(
    response: Response,
    page: int = Query(default=1, ge=1),
    page_size: int = Query(default=10, ge=1, le=50),
    user: dict = Depends(get_current_user),
    database: Database = Depends(get_database),
) -> dict:
    response.headers["Cache-Control"] = "no-store"

    try:
        return list_own_submissions(
            database,
            user["_id"],
            page,
            page_size,
        )
    except PyMongoError:
        raise HTTPException(
            status_code=503,
            detail="Your submissions could not be loaded.",
        ) from None

@router.get(
    "/lookup",
    dependencies=[
        Depends(get_current_user),
        Depends(require_browser_request),
    ],
)
def lookup_restaurant(
    response: Response,
    q: str = Query(min_length=2, max_length=100),
    latitude: float = Query(ge=-90, le=90),
    longitude: float = Query(ge=-180, le=180),
    radius_km: int = Query(default=10, ge=1, le=30),
    external: bool = Query(default=False),
    database: Database = Depends(get_database),
) -> dict:
    response.headers["Cache-Control"] = "no-store"
    query = " ".join(q.split())

    if len(query) < 2:
        raise HTTPException(
            status_code=422,
            detail="Enter at least two characters.",
        )

    try:
        existing = find_existing_restaurants(database, query)
    except PyMongoError:
        raise HTTPException(
            status_code=503,
            detail="SeekMakan could not check existing restaurants. Try again.",
        ) from None

    # Existing results appear without waiting for the external provider.
    if existing and not external:
        return {
            "existing": existing,
            "items": [],
            "external_searched": False,
            "warning": "",
        }

    try:
        candidates = search_restaurant_candidates(
            query, latitude, longitude, radius_km
        )
        warning = ""
    except RestaurantLookupError as error:
        # Keep local matches visible if external search fails.
        candidates = []
        warning = str(error)

    return {
        "existing": existing,
        "items": candidates,
        "external_searched": True,
        "warning": warning,
    }

@router.post(
    "/{submission_id}/withdraw",
    dependencies=[Depends(require_browser_request)],
)
def withdraw_own_submission(
    submission_id: str,
    response: Response,
    user: dict = Depends(get_current_user),
    database: Database = Depends(get_database),
) -> dict:
    response.headers["Cache-Control"] = "no-store"

    if not ObjectId.is_valid(submission_id):
        raise HTTPException(
            status_code=422,
            detail="Invalid submission ID.",
        )

    try:
        changed = withdraw_submission(
            database,
            ObjectId(submission_id),
            user["_id"],
        )
    except PyMongoError:
        raise HTTPException(
            status_code=503,
            detail="Withdrawal could not be confirmed. Refresh your submissions.",
        ) from None

    if not changed:
        raise HTTPException(
            status_code=409,
            detail=(
                "This submission cannot be withdrawn. "
                "Refresh to check its current status."
            ),
        )

    return {"message": "Submission withdrawn."}
