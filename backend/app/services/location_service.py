import json
from collections import OrderedDict
from threading import Lock
from time import monotonic
from urllib.error import HTTPError, URLError
from urllib.parse import urlencode
from urllib.request import urlopen

from pydantic import ValidationError

from app.config import settings
from app.schemas.location import LocationResult

class LocationSearchError(Exception):
    def __init__(self, message: str, status_code: int = 503):
        super().__init__(message)
        self.status_code = status_code

CACHE_SECONDS = 3600
MAX_CACHE_ENTRIES = 256
MIN_REQUEST_INTERVAL = 1.0

_cache: OrderedDict[
    str, tuple[float, list[LocationResult]]
] = OrderedDict()
_lock = Lock()
_last_request_at = float("-inf")

def search_locations(text: str) -> list[LocationResult]:
    global _last_request_at

    query = " ".join(text.split())

    if len(query) < 3:
        raise LocationSearchError(
            "Enter at least 3 characters.",
            status_code=422,
        )

    api_key = settings.geoapify_api_key.get_secret_value()

    if not api_key:
        raise LocationSearchError(
            "Location search is not configured."
        )

    cache_key = query.casefold()

    # A single lock prevents simultaneous upstream calls in this process.
    with _lock:
        now = monotonic()
        cached = _cache.get(cache_key)

        if cached is not None:
            expires_at, items = cached

            if expires_at > now:
                _cache.move_to_end(cache_key)
                return items

            del _cache[cache_key]

        if now - _last_request_at < MIN_REQUEST_INTERVAL:
            raise LocationSearchError(
                "Please wait a moment before searching again.",
                status_code=429,
            )

        _last_request_at = now

        parameters = urlencode({
            "text": query,
            "filter": "countrycode:my",
            "format": "json",
            "limit": 5,
            "apiKey": api_key,
        })

        url = (
            "https://api.geoapify.com/v1/geocode/search?"
            + parameters
        )

        try:
            with urlopen(url, timeout=8) as response:
                payload = json.load(response)

        except HTTPError as error:
            if error.code == 429:
                raise LocationSearchError(
                    "Location search is temporarily rate-limited. "
                    "Please try again later.",
                    status_code=429,
                ) from None

            raise LocationSearchError(
                "The location provider could not complete the search."
            ) from None

        except (URLError, TimeoutError, OSError):
            raise LocationSearchError(
                "Location search is unavailable. "
                "Try again or choose a location on the map."
            ) from None

        except (ValueError, UnicodeError):
            raise LocationSearchError(
                "The location provider returned an invalid response."
            ) from None

        if (
            not isinstance(payload, dict)
            or not isinstance(payload.get("results"), list)
        ):
            raise LocationSearchError(
                "The location provider returned an invalid response."
            )

        items = []

        for result in payload["results"]:
            if not isinstance(result, dict):
                continue

            label = result.get("formatted")

            if not isinstance(label, str) or not label.strip():
                continue

            latitude = result.get("lat")
            longitude = result.get("lon")

            if (
                not isinstance(latitude, (int, float))
                or isinstance(latitude, bool)
                or not isinstance(longitude, (int, float))
                or isinstance(longitude, bool)
            ):
                continue

            address_fields = {
                key: value.strip()
                for key, value in result.items()
                if isinstance(value, str)
            }

            try:
                item = LocationResult(
                    label=label,
                    latitude=float(latitude),
                    longitude=float(longitude),
                    city=(
                        address_fields.get("city", "")
                        or address_fields.get("town", "")
                        or address_fields.get("village", "")
                    ),
                    state=address_fields.get("state", ""),
                    postcode=address_fields.get("postcode", ""),
                )
            except ValidationError:
                continue

            items.append(item)

        _cache[cache_key] = (
            monotonic() + CACHE_SECONDS,
            items,
        )
        _cache.move_to_end(cache_key)

        while len(_cache) > MAX_CACHE_ENTRIES:
            _cache.popitem(last=False)

        return items