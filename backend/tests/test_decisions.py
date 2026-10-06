from unittest.mock import MagicMock, patch

import pytest
from fastapi.testclient import TestClient
from pymongo.database import Database

from app.database import get_database
from app.main import app

client = TestClient(app)

@pytest.fixture
def decision_database():
    previous = app.dependency_overrides.copy()
    app.dependency_overrides[get_database] = (
        lambda: MagicMock(spec=Database)
    )

    yield

    app.dependency_overrides.clear()
    app.dependency_overrides.update(previous)

def valid_request():
    return {
        "source": "nearby",
        "latitude": 2.7911,
        "longitude": 101.7889,
        "radius_km": 5,
    }

@pytest.mark.parametrize(
    "source, expected_hidden_gems",
    [("nearby", False), ("hidden_gems", True)],
)
def test_source_and_location_reach_repository(
    decision_database,
    source,
    expected_hidden_gems,
):
    payload = valid_request()
    payload["source"] = source

    with patch(
        "app.services.decision_service.list_restaurants",
        return_value=([], 0),
    ) as repository:
        response = client.post(
            "/api/decisions/candidates",
            json=payload,
        )

    assert response.status_code == 200
    assert response.json() == {"items": [], "total": 0}

    arguments = repository.call_args.kwargs
    assert arguments["latitude"] == 2.7911
    assert arguments["longitude"] == 101.7889
    assert arguments["radius_km"] == 5
    assert arguments["hidden_gems"] is expected_hidden_gems
    assert arguments["page_size"] == 501

def test_rejects_missing_location(decision_database):
    with patch(
        "app.services.decision_service.list_restaurants"
    ) as repository:
        response = client.post(
            "/api/decisions/candidates",
            json={"source": "nearby"},
        )

    assert response.status_code == 422
    repository.assert_not_called()

def test_rejects_unsupported_source(decision_database):
    payload = valid_request()
    payload["source"] = "favourites"

    response = client.post(
        "/api/decisions/candidates",
        json=payload,
    )

    assert response.status_code == 422

def test_rejects_oversized_pool(decision_database):
    with patch(
        "app.services.decision_service.list_restaurants",
        return_value=([], 501),
    ):
        response = client.post(
            "/api/decisions/candidates",
            json=valid_request(),
        )

    assert response.status_code == 422
    assert "Reduce the distance" in response.json()["detail"]

def test_food_candidates_are_unique_and_sorted(decision_database):
    restaurants = [
        {"food_categories": ["Rice", "Noodles"]},
        {"food_categories": ["Noodles", "Nasi Lemak"]},
        {"food_categories": []},
    ]

    with patch(
        "app.services.decision_service.list_restaurants",
        return_value=(restaurants, 3),
    ):
        response = client.post(
            "/api/decisions/food-candidates",
            json=valid_request(),
        )

    assert response.status_code == 200
    assert response.json() == {
        "items": ["Nasi Lemak", "Noodles", "Rice"],
        "total": 3,
    }


def test_food_candidates_can_be_empty(decision_database):
    with patch(
        "app.services.decision_service.list_restaurants",
        return_value=([], 0),
    ):
        response = client.post(
            "/api/decisions/food-candidates",
            json=valid_request(),
        )

    assert response.status_code == 200
    assert response.json() == {"items": [], "total": 0}


def test_food_candidate_filters_reach_repository(decision_database):
    payload = valid_request()
    payload.update({
        "source": "hidden_gems",
        "cuisines": ["Malay"],
        "price_range": "RM1-RM20",
        "min_rating": 4,
        "open_now": True,
    })

    with patch(
        "app.services.decision_service.list_restaurants",
        return_value=([], 0),
    ) as repository:
        response = client.post(
            "/api/decisions/food-candidates",
            json=payload,
        )

    assert response.status_code == 200

    arguments = repository.call_args.kwargs
    assert arguments["latitude"] == payload["latitude"]
    assert arguments["longitude"] == payload["longitude"]
    assert arguments["radius_km"] == 5
    assert arguments["cuisines"] == ["Malay"]
    assert arguments["price_range"] == "RM1-RM20"
    assert arguments["min_rating"] == 4
    assert arguments["open_now"] is True
    assert arguments["hidden_gems"] is True


def test_nearby_food_candidates_require_location(decision_database):
    with patch(
        "app.services.decision_service.list_restaurants"
    ) as repository:
        response = client.post(
            "/api/decisions/food-candidates",
            json={},
        )

    assert response.status_code == 422
    repository.assert_not_called()


def test_food_candidates_reject_oversized_restaurant_pool(
    decision_database,
):
    with patch(
        "app.services.decision_service.list_restaurants",
        return_value=([], 501),
    ):
        response = client.post(
            "/api/decisions/food-candidates",
            json=valid_request(),
        )

    assert response.status_code == 422