from datetime import datetime, timezone
from typing import Literal
from uuid import uuid4
import re

from bson import ObjectId
from fastapi import (
    APIRouter,
    Depends,
    File,
    Form,
    HTTPException,
    Response,
    UploadFile,
)
from fastapi.responses import FileResponse
from pymongo.database import Database
from pymongo.errors import PyMongoError

from app.database import get_database
from app.services.sessions import (
    get_current_user,
    require_browser_request,
)
from app.services.submission_images import (
    InvalidSubmissionImage,
    MAX_UPLOAD_BYTES,
    UPLOAD_DIRECTORY,
    prepare_image,
)

router = APIRouter(
    prefix="/api/submissions",
    tags=["Submission photos"],
)

def parse_id(value: str) -> ObjectId:
    if not ObjectId.is_valid(value):
        raise HTTPException(422, "Invalid submission ID.")

    return ObjectId(value)

@router.post(
    "/{submission_id}/photos",
    dependencies=[Depends(require_browser_request)],
    status_code=201,
)
def upload_submission_photo(
    submission_id: str,
    response: Response,
    file: UploadFile = File(),
    kind: Literal["restaurant", "food"] = Form(),
    permission_confirmed: bool = Form(),
    user: dict = Depends(get_current_user),
    database: Database = Depends(get_database),
) -> dict:
    response.headers["Cache-Control"] = "no-store"

    if not permission_confirmed:
        raise HTTPException(
            422,
            "Confirm that you own the photo or have permission to upload it.",
        )

    object_id = parse_id(submission_id)

    editable_query = {
        "_id": object_id,
        "user_id": user["_id"],
        "status": {"$in": ["pending", "changes_requested"]},
    }

    try:
        submission = database["restaurant_submissions"].find_one(
            editable_query,
            {"_id": 1},
        )
    except PyMongoError:
        raise HTTPException(503, "Submission service unavailable.") from None

    if submission is None:
        raise HTTPException(
            404,
            "An editable submission was not found.",
        )

    try:
        raw = file.file.read(MAX_UPLOAD_BYTES + 1)
    finally:
        file.file.close()

    try:
        processed = prepare_image(raw)
    except InvalidSubmissionImage as error:
        raise HTTPException(422, str(error)) from None

    photo_id = uuid4().hex
    path = UPLOAD_DIRECTORY / f"{photo_id}.jpg"

    try:
        UPLOAD_DIRECTORY.mkdir(parents=True, exist_ok=True)

        # Never use a user-provided filename as a storage path.
        with path.open("xb") as destination:
            destination.write(processed)
    except OSError:
        raise HTTPException(503, "Photo storage unavailable.") from None

    photo = {
        "id": photo_id,
        "kind": kind,
        "url": f"/api/submissions/{submission_id}/photos/{photo_id}",
        "created_at": datetime.now(timezone.utc),
        "permission_confirmed": True,
    }

    try:
        result = database["restaurant_submissions"].update_one(
            {
                **editable_query,
                "$expr": {
                    "$lt": [
                        {"$size": {"$ifNull": ["photos", []]}},
                        5,
                    ]
                },
            },
            {
                "$push": {"photos": photo},
                "$set": {"updated_at": datetime.now(timezone.utc)},
            },
        )
    except PyMongoError:
        # The database outcome may be uncertain. Keep the file instead
        # of risking deletion of a successfully attached image.
        raise HTTPException(
            503,
            "Upload could not be confirmed. Refresh before retrying.",
        ) from None

    if result.modified_count != 1:
        # This file was not attached. Remove this newly created file only.
        path.unlink(missing_ok=True)
        raise HTTPException(
            409,
            "The submission is no longer editable or already has five photos.",
        )

    return {"message": "Photo uploaded.", "photo": photo}


@router.get("/{submission_id}/photos/{photo_id}")
def retrieve_submission_photo(
    submission_id: str,
    photo_id: str,
    user: dict = Depends(get_current_user),
    database: Database = Depends(get_database),
):
    object_id = parse_id(submission_id)

    if not re.fullmatch(r"[a-f0-9]{32}", photo_id):
        raise HTTPException(404, "Photo not found.")

    try:
        submission = database["restaurant_submissions"].find_one(
            {
                "_id": object_id,
                "user_id": user["_id"],
                "photos.id": photo_id,
            },
            {"_id": 1},
        )
    except PyMongoError:
        raise HTTPException(503, "Photo service unavailable.") from None

    if submission is None:
        raise HTTPException(404, "Photo not found.")

    path = UPLOAD_DIRECTORY / f"{photo_id}.jpg"

    if not path.is_file():
        raise HTTPException(404, "Photo file is unavailable.")

    return FileResponse(
        path,
        media_type="image/jpeg",
        headers={
            "Cache-Control": "private, no-store",
            "X-Content-Type-Options": "nosniff",
        },
    )