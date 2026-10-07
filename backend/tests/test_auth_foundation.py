import pytest
from pydantic import SecretStr, ValidationError

from app.schemas.auth import RegisterRequest
from app.security import hash_password, verify_password

PASSWORD = "my_secure_password_123"

def test_password_hashing() -> None:
    first_hash = hash_password(PASSWORD)
    second_hash = hash_password(PASSWORD)

    assert first_hash != PASSWORD
    assert first_hash != second_hash
    assert verify_password(PASSWORD, first_hash)
    assert not verify_password("An incorrect password", first_hash)

def test_registration_input() -> None:
    request = RegisterRequest(
        display_name="  Jasmine  ",
        email="jasmine@example.com",
        password=SecretStr(PASSWORD),
    )

    assert request.display_name == "Jasmine"
    assert request.password.get_secret_value() == PASSWORD
    assert PASSWORD not in repr(request)


@pytest.mark.parametrize(
    "changes",
    [
        {"display_name": "   "},
        {"email": "not-an-email"},
        {"password": "short"},
        {"password": "x" * 129},
        {"password": "My TestPassword2026!"},
        {"password": "MyTestPassword2026!\t"},
        {"password": "MyTestPassword2026!\n"},
        {"role": "admin"},
    ],
)
def test_reject_invalid_registration(changes: dict) -> None:
    data = {
        "display_name": "Jasmine",
        "email": "jasmine@example.com",
        "password": PASSWORD,
    }
    data.update(changes)

    with pytest.raises(ValidationError):
        RegisterRequest.model_validate(data)

@pytest.mark.parametrize(
    ("length", "accepted"),
    [(11, False), (12, True)],
)
def test_password_minimum_length(length: int, accepted: bool) -> None:
    data = {
        "display_name": "Jasmine",
        "email": "jasmine@example.com",
        "password": "x" * length,
    }

    if accepted:
        RegisterRequest.model_validate(data)
    else:
        with pytest.raises(ValidationError):
            RegisterRequest.model_validate(data)