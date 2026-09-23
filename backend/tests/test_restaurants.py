from datetime import datetime, timezone
from unittest.mock import MagicMock, patch

import pytest
from fastapi.testclient import TestClient

from app.database import get_database
from app.main import app

SAMPLE_RESTAURANT_ID = "688abc123456789012345678"

SAMPLE_RESTAURANT = {
    "id": SAMPLE_RESTAURANT_ID,
    "name": "Test Nasi Lemak",
    "description": "A restaurant created for testing.",
    "address": {
        "full_address": "12 Jalan Test, Nilai",
        "city": "Nilai",
        "state": "Negeri Sembilan",
        "postcode": "71800",
    },
    "location": {
        "type": "Point",
        "coordinates": [101.7972, 2.8141],
    },
    "cuisines": ["Malaysian"],
    "food_categories": ["Rice"],
    "price_range": "RM1-RM20",
    "operating_hours": {
        "monday": {
            "open": "08:00",
            "close": "22:00",
        }
    },
    "verification_status": "seeded",
    "visibility_status": "active",
    "source": {
        "type": "manual",
        "external_id": None,
        "last_checked_at": None,
    },
    "average_rating": 4.5,
    "review_count": 10,
    "created_at": datetime(
        2026,
        8,
        1,
        8,
        0,
        tzinfo=timezone.utc,
    ),
    "updated_at": datetime(
        2026,
        8,
        1,
        8,
        0,
        tzinfo=timezone.utc,
    ),
}

client = TestClient(app)

@pytest.fixture(autouse=True)
def override_get_database():
    fake_database = MagicMock()

    app.dependency_overrides[get_database] = (
        lambda: fake_database 
    )

    yield fake_database
    app.dependency_overrides.clear()

# Test restaurant list
def test_list_restaurants_successfully() -> None:
    with patch(
        "app.routers.restaurants.browse_restaurants",
        return_value={"items": [SAMPLE_RESTAURANT], "page": 1, "page_size": 20, "total": 1, "total_pages": 1},
    ):
        response = client.get("/api/restaurants")

    assert response.status_code == 200

    response_data = response.json()

    assert len(response_data["items"]) == 1
    assert response_data["items"][0]["id"] == SAMPLE_RESTAURANT_ID
    assert response_data["items"][0]["name"] == "Test Nasi Lemak"


# Test empty list
def test_list_restaurants_when_none_exist() -> None:
    with patch(
        "app.routers.restaurants.browse_restaurants",
        return_value={"items": [], "page": 1, "page_size": 20, "total": 0, "total_pages": 0},
    ):
        response = client.get("/api/restaurants")

    assert response.status_code == 200
    assert response.json()["items"] == []
    assert response.json()["total_pages"] == 0


# Test restaurant details
def test_get_existing_restaurant() -> None:
    with patch(
        "app.routers.restaurants.find_restaurant",
        return_value=SAMPLE_RESTAURANT,
    ):
        response = client.get(
            f"/api/restaurants/{SAMPLE_RESTAURANT_ID}"
        )

    assert response.status_code == 200

    response_data = response.json()

    assert response_data["id"] == SAMPLE_RESTAURANT_ID
    assert response_data["name"] == "Test Nasi Lemak"
    assert response_data["address"]["city"] == "Nilai"

# Test an unknown restaurant
def test_get_unknown_restaurant_returns_404() -> None:
    with patch(
        "app.routers.restaurants.find_restaurant",
        return_value=None,
    ):
        response = client.get(
            "/api/restaurants/688abc999999999999999999"
        )

    assert response.status_code == 404
    assert response.json() == {
        "detail": "Restaurant not found"
    }

# Test a malformed ID
def test_get_malformed_restaurant_id_returns_404() -> None:
    with patch(
        "app.routers.restaurants.find_restaurant",
        return_value=None,
    ):
        response = client.get(
            "/api/restaurants/not-a-valid-id"
        )

    assert response.status_code == 404
    assert response.json()["detail"] == "Restaurant not found"

# Test coordinate validation
# Test longitude validation
def test_rejects_invalid_longitude() -> None:
    request_body = {
        "name": "Invalid Location Restaurant",
        "description": "Used for validation testing.",
        "address": {
            "full_address": "12 Jalan Test, Nilai",
            "city": "Nilai",
            "state": "Negeri Sembilan",
            "postcode": "71800",
        },
        "location": {
            "type": "Point",
            "coordinates": [200, 2.8141],
        },
        "cuisines": ["Malaysian"],
        "food_categories": ["Rice"],
        "price_range": "RM1-RM20",
        "operating_hours": {},
        "verification_status": "seeded",
        "source": {
            "type": "manual"
        },
    }

    response = client.post(
        "/api/restaurants",
        json=request_body,
    )

    assert response.status_code == 422

# Test latitude validation
def test_rejects_invalid_latitude() -> None:
    request_body = {
        "name": "Invalid Location Restaurant",
        "description": "Used for validation testing.",
        "address": {
            "full_address": "12 Jalan Test, Nilai",
            "city": "Nilai",
            "state": "Negeri Sembilan",
            "postcode": "71800",
        },
        "location": {
            "type": "Point",
            "coordinates": [101.7972, 100],
        },
        "cuisines": ["Malaysian"],
        "food_categories": ["Rice"],
        "price_range": "RM1-RM20",
        "operating_hours": {},
        "verification_status": "seeded",
        "source": {
            "type": "manual",
        },
    }

    response = client.post(
        "/api/restaurants",
        json=request_body,
    )

    assert response.status_code == 422

# Test name validation
def test_rejects_restaurant_name_that_is_too_short() -> None:
    request_body = {
        "name": "A",
        "address": {
            "full_address": "12 Jalan Test, Nilai",
            "city": "Nilai",
            "state": "Negeri Sembilan",
            "postcode": "71800",
        },
        "location": {
            "type": "Point",
            "coordinates": [101.7972, 2.8141],
        },
        "cuisines": [],
        "food_categories": [],
        "operating_hours": {},
        "verification_status": "seeded",
        "source": {
            "type": "manual"
        },
    }

    response = client.post(
        "/api/restaurants",
        json=request_body,
    )

    assert response.status_code == 422
