import json
from collections import OrderedDict
from threading import Lock
from time import monotonic
from urllib.error import HTTPError, URLError
from urllib.parse import urlencode
from urllib.request import urlopen

from pydantic import BaseModel, Field, ValidationError

from app.config import settings


class RestaurantCandidate(BaseModel):
    provider_id: str
    name: str = Field(min_length=1, max_length=300)
    full_address: str = ""
    city: str = ""
    state: str = ""
    postcode: str = ""
    latitude: float = Field(ge=-90, le=90)
    longitude: float = Field(ge=-180, le=180)


class RestaurantLookupError(Exception):
    def __init__(self, message: str, status_code: int = 503):
        super().__init__(message)
        self.status_code = status_code


_cache: OrderedDict = OrderedDict()
_lock = Lock()
_last_request_at = float("-inf")

CACHE_SECONDS = 3600
MAX_CACHE_ENTRIES = 256


def search_restaurant_candidates(
    query: str,
    latitude: float | None = None,
    longitude: float | None = None,
    radius_km: int = 10,
) -> list[dict]:
    global _last_request_at

    query = " ".join(query.split())

    if len(query) < 2:
        raise RestaurantLookupError(
            "Enter at least two characters.",
            422,
        )

    api_key = settings.geoapify_api_key.get_secret_value()

    if not api_key:
        raise RestaurantLookupError(
            "Restaurant lookup is not configured."
        )

    cache_key = (
        query.casefold(),
        latitude,
        longitude,
        radius_km,
    )

    # Serialises upstream requests within this backend process.
    with _lock:
        now = monotonic()
        cached = _cache.get(cache_key)

        if cached and cached[0] > now:
            _cache.move_to_end(cache_key)
            return cached[1]

        if now - _last_request_at < 1:
            raise RestaurantLookupError(
                "Please wait a moment before searching again.",
                429,
            )

        _last_request_at = now

        parameters = urlencode({
            "categories": "catering",
            "name": query,
            "filter": (
                f"circle:{longitude},{latitude},{radius_km * 1000}"
            ),
            "bias": f"proximity:{longitude},{latitude}",
            "limit": 8,
            "apiKey": api_key,
        })

        url = f"https://api.geoapify.com/v2/places?{parameters}"
        if latitude is None or longitude is None:
            parameters = urlencode({
                "text": query, "type": "amenity", "filter": "countrycode:my",
                "limit": 8, "apiKey": api_key,
            })
            url = f"https://api.geoapify.com/v1/geocode/autocomplete?{parameters}"

        try:
            with urlopen(url, timeout=8) as response:
                payload = json.load(response)
        except HTTPError as error:
            if error.code == 429:
                raise RestaurantLookupError(
                    "Restaurant search is temporarily rate-limited. "
                    "Try later or add the restaurant manually.",
                    429,
                ) from None

            raise RestaurantLookupError(
                "Restaurant search is unavailable. "
                "You can still add the restaurant manually."
            ) from None
        except (URLError, TimeoutError, OSError, ValueError):
            raise RestaurantLookupError(
                "Restaurant search could not be completed. "
                "Try again or add the restaurant manually."
            ) from None

        if (
            not isinstance(payload, dict)
            or not isinstance(payload.get("features"), list)
        ):
            raise RestaurantLookupError(
                "The location provider returned an invalid response."
            )

        candidates = []
        seen = set()

        for feature in payload["features"]:
            if not isinstance(feature, dict):
                continue

            properties = feature.get("properties")

            if not isinstance(properties, dict):
                continue

            text_fields: dict[str, str] = {
                key: value.strip()
                for key, value in properties.items()
                if isinstance(key, str) and isinstance(value, str)
            }

            # Keep results in Malaysia when country data is available.
            country = text_fields.get("country_code", "").lower()

            if country and country != "my":
                continue

            provider_id = text_fields.get("place_id", "")
            name = text_fields.get("name", "")
            if not provider_id or provider_id in seen or not name:
                continue
            latitude_value = properties.get("lat")
            longitude_value = properties.get("lon")

            if (
                not isinstance(latitude_value, (int, float))
                or isinstance(latitude_value, bool)
                or not isinstance(longitude_value, (int, float))
                or isinstance(longitude_value, bool)
            ):
                continue

            try:
                candidate = RestaurantCandidate(
                    provider_id=provider_id,
                    name=name,
                    full_address=text_fields.get("formatted", ""),
                    city=(
                        text_fields.get("city", "")
                        or text_fields.get("town", "")
                        or text_fields.get("village", "")
                    ),
                    state=text_fields.get("state", ""),
                    postcode=text_fields.get("postcode", ""),
                    latitude=float(latitude_value),
                    longitude=float(longitude_value),
                )
            except ValidationError:
                continue

            seen.add(provider_id)
            candidates.append(candidate.model_dump())

        _cache[cache_key] = (
            monotonic() + CACHE_SECONDS,
            candidates,
        )
        _cache.move_to_end(cache_key)

        while len(_cache) > MAX_CACHE_ENTRIES:
            _cache.popitem(last=False)

        return candidates
