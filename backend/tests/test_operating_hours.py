import pytest
from pydantic import ValidationError

from app.schemas.restaurant import (
    DailyOperatingHours,
    RestaurantCreate,
)


@pytest.mark.parametrize(
    "payload",
    [
        {"open": "08:00", "close": "22:00"},
        {"status": "open", "open": "18:00", "close": "02:00"},
        {"status": "closed"},
        {"status": "open_24_hours"},
    ],
)
def test_accepts_valid_operating_hours(payload):
    hours = DailyOperatingHours.model_validate(payload)

    assert hours.status == payload.get("status", "open")


@pytest.mark.parametrize(
    "payload",
    [
        {"status": "open"},
        {"status": "open", "open": "08:00"},
        {"open": "25:00", "close": "22:00"},
        {"open": "08:60", "close": "22:00"},
        {"open": "8:00", "close": "22:00"},
        {"open": "08:00", "close": "08:00"},
        {"status": "closed", "open": "08:00", "close": "22:00"},
        {"status": "open_24_hours", "open": "00:00"},
        {"status": "closed", "open": ""},
        {"status": "unknown"},
    ],
)
def test_rejects_invalid_operating_hours(payload):
    with pytest.raises(ValidationError):
        DailyOperatingHours.model_validate(payload)


def restaurant_payload():
    return {
        "name": "Test Opening Hours",
        "address": {
            "full_address": "12 Jalan Test, Nilai",
            "city": "Nilai",
            "state": "Negeri Sembilan",
        },
        "location": {
            "type": "Point",
            "coordinates": [101.7972, 2.8141],
        },
    }


def test_missing_days_remain_unknown():
    payload = restaurant_payload()
    payload["operating_hours"] = {
        "monday": {"status": "closed"}
    }

    restaurant = RestaurantCreate.model_validate(payload)

    assert restaurant.operating_hours["monday"].status == "closed"
    assert "tuesday" not in restaurant.operating_hours


def test_rejects_invalid_weekday():
    payload = restaurant_payload()
    payload["operating_hours"] = {
        "mondy": {"status": "closed"}
    }

    with pytest.raises(ValidationError):
        RestaurantCreate.model_validate(payload)