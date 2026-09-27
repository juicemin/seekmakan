MIN_RATING = 4.0
MIN_REVIEWS = 5
MAX_REVIEWS_EXCLUSIVE = 50


def is_hidden_gem(average_rating: float, review_count: int) -> bool:
    return (
        average_rating >= MIN_RATING
        and MIN_REVIEWS <= review_count < MAX_REVIEWS_EXCLUSIVE
    )


def build_hidden_gem_query() -> dict:
    return {
        "average_rating": {"$gte": MIN_RATING},
        "review_count": {
            "$gte": MIN_REVIEWS,
            "$lt": MAX_REVIEWS_EXCLUSIVE,
        },
    }