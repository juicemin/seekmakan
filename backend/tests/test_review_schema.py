import pytest
from pydantic import ValidationError
from app.schemas.review import ReviewInput

def test_review_accepts_rating_and_trims_comment():
    review = ReviewInput(
        rating=4,
        comment="  Good noodles and friendly service.  ",
    )

    assert review.rating == 4
    assert review.comment == "Good noodles and friendly service."

@pytest.mark.parametrize(
    "rating",
    [0, 6, 3.5, "5", True, None],
)
def test_review_rejects_invalid_rating(rating):
    with pytest.raises(ValidationError):
        ReviewInput(rating=rating, comment="Good food.")

@pytest.mark.parametrize(
    "comment",
    ["", "   ", "\n\t", "a" * 1001],
)
def test_review_rejects_invalid_comment(comment):
    with pytest.raises(ValidationError):
        ReviewInput(rating=4, comment=comment)

def test_review_requires_written_comment():
    with pytest.raises(ValidationError):
        ReviewInput.model_validate({"rating": 4})

def test_review_rejects_client_supplied_author():
    with pytest.raises(ValidationError):
        ReviewInput.model_validate({
            "rating": 4,
            "comment": "Good food.",
            "user_id": "someone-else",
        })