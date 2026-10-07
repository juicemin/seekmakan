import hashlib
import time
from datetime import datetime, timezone

from pymongo import ReturnDocument
from pymongo.database import Database
from pymongo.errors import DuplicateKeyError


class AuthRateLimitError(Exception):
    pass


def enforce_limit(
    database: Database,
    key: str,
    maximum: int,
    seconds: int,
) -> None:
    window = int(time.time()) // seconds
    key_hash = hashlib.sha256(key.encode("utf-8")).hexdigest()
    document_id = f"{key_hash}:{seconds}:{window}"

    expires_at = datetime.fromtimestamp(
        (window + 2) * seconds,
        tz=timezone.utc,
    )

    collection = database["auth_rate_limits"]

    try:
        document = collection.find_one_and_update(
            {"_id": document_id},
            {
                "$inc": {"count": 1},
                "$setOnInsert": {"expires_at": expires_at},
            },
            upsert=True,
            return_document=ReturnDocument.AFTER,
        )
    except DuplicateKeyError:
        # Another request may have created this counter simultaneously.
        document = collection.find_one_and_update(
            {"_id": document_id},
            {"$inc": {"count": 1}},
            return_document=ReturnDocument.AFTER,
        )

    if document is None or document["count"] > maximum:
        raise AuthRateLimitError