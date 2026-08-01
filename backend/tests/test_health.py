from unittest.mock import MagicMock
from fastapi.testclient import TestClient
from pymongo.errors import ServerSelectionTimeoutError
from app.database import get_database
from app.main import app

client = TestClient(app)

def test_liveness_check() -> None:
    response = client.get("/health/live")

    assert response.status_code == 200
    assert response.json() == {"status": "alive"}

def test_readiness_when_database_is_connected() -> None:
    fake_database = MagicMock()
    fake_database.command.return_value = {"ok": 1}

    app.dependency_overrides[get_database] = (
        lambda: fake_database
    )

    try:
        response = client.get("/health/ready")
    finally:
        app.dependency_overrides.clear()

    assert response.status_code == 200
    assert response.json() == {
        "status": "ready",
        "database": "connected",
    }

def test_readiness_when_database_is_disconnected() -> None:
    fake_database = MagicMock()
    fake_database.command.side_effect = (
        ServerSelectionTimeoutError(
            "Test database connection failure"
        )
    )

    app.dependency_overrides[get_database] = (
        lambda: fake_database
    )

    try:
        response = client.get("/health/ready")
    finally:
        app.dependency_overrides.clear()

    assert response.status_code == 503
    assert response.json() == {
        "status": "not_ready",
        "database": "disconnected",
    }