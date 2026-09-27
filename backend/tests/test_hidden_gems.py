import pytest

from app.repositories.hidden_gems import (
    build_hidden_gem_query,
    is_hidden_gem,
)


@pytest.mark.parametrize(
    "rating, count, expected",
    [
        (0.0, 0, False),
        (3.9, 10, False),
        (4.0, 4, False),
        (4.0, 5, True),
        (4.5, 20, True),
        (5.0, 49, True),
        (5.0, 50, False),
        (5.0, 100, False),
    ],
)
def test_hidden_gem_boundaries(rating, count, expected):
    assert is_hidden_gem(rating, count) is expected


def test_hidden_gem_query():
    assert build_hidden_gem_query() == {
        "average_rating": {"$gte": 4.0},
        "review_count": {"$gte": 5, "$lt": 50},
    }