import pytest
from pydantic import ValidationError
from app.schemas.submission import RestaurantSubmissionInput

def sample_submission():
    return {
        "name": "Example Restaurant",
        "address": {
            "full_address": "123 Example Road, Seremban",
            "city": "Seremban",
            "state": "Negeri Sembilan",
        },
        "location": {
            "type": "Point",
            "coordinates": [101.94, 2.73],
        },
        "food_categories": ["Noodles"],
    }

def test_submission_accepts_unknown_optional_information():
    submission = RestaurantSubmissionInput.model_validate(
        sample_submission()
    )

    assert submission.price_range is None
    assert submission.operating_hours == {}

def test_submission_rejects_blank_name():
    data = sample_submission()
    data["name"] = "   "

    with pytest.raises(ValidationError):
        RestaurantSubmissionInput.model_validate(data)

def test_submission_rejects_invalid_coordinates():
    data = sample_submission()
    data["location"]["coordinates"] = [101.94, 95]

    with pytest.raises(ValidationError):
        RestaurantSubmissionInput.model_validate(data)

@pytest.mark.parametrize(
    "field",
    ["status", "user_id", "verification_status", "average_rating"],
)
def test_submission_rejects_server_managed_fields(field):
    data = sample_submission()
    data[field] = "not allowed"

    with pytest.raises(ValidationError):
        RestaurantSubmissionInput.model_validate(data)