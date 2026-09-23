from unittest.mock import MagicMock
import pytest
from typing import cast
from pymongo.database import Database
from app.repositories.restaurant_repository import (
    get_restaurant_filter_options,
    list_restaurants,
)

@pytest.fixture
def database(collection) -> Database:
    mock_database = MagicMock(spec=Database)
    mock_database.__getitem__.return_value = collection
    return cast(Database, mock_database)

@pytest.fixture
def collection():
    collection = MagicMock()
    cursor = MagicMock()

    collection.find.return_value = cursor
    cursor.sort.return_value = cursor
    cursor.skip.return_value = cursor
    cursor.limit.return_value = cursor
    cursor.__iter__.return_value = iter([])

    collection.count_documents.return_value = 0

    return collection


def test_no_filters_only_requests_active_restaurants(
    collection,
    database: Database,
):

    items, total = list_restaurants(database)

    expected = {"visibility_status": "active"}
    collection.find.assert_called_once_with(expected)
    collection.count_documents.assert_called_once_with(expected)
    assert items == []
    assert total == 0


def test_search_escapes_special_characters(
    collection,
    database: Database,
):

    list_restaurants(database, search="Rice.*")

    query = collection.find.call_args.args[0]

    assert query["visibility_status"] == "active"
    assert query["$or"] == [
        {"name": {"$regex": r"Rice\.\*", "$options": "i"}},
        {"cuisines": {"$regex": r"Rice\.\*", "$options": "i"}},
        {"food_categories": {"$regex": r"Rice\.\*", "$options": "i"}},
    ]


def test_filters_combine_before_counting_and_pagination(
    collection,
    database: Database,
):

    list_restaurants(
        database,
        page=2,
        page_size=2,
        cuisines=["Malay", "Chinese"],
        food_categories=["Rice", "Noodles"],
        price_range="RM1-RM20",
        min_rating=4,
    )

    expected = {
        "visibility_status": "active",
        "cuisines": {"$in": ["Malay", "Chinese"]},
        "food_categories": {"$in": ["Rice", "Noodles"]},
        "price_range": "RM1-RM20",
        "average_rating": {"$gte": 4},
        "review_count": {"$gt": 0},
    }

    collection.find.assert_called_once_with(expected)
    collection.count_documents.assert_called_once_with(expected)

    cursor = collection.find.return_value
    cursor.sort.assert_called_once_with("_id", 1)
    cursor.skip.assert_called_once_with(2)
    cursor.limit.assert_called_once_with(2)


@pytest.mark.parametrize("threshold", [0, 3, 4, 4.5, 5])
def test_rating_threshold_is_inclusive(
    collection,
    database: Database,
    threshold
):

    list_restaurants(database, min_rating=threshold)

    query = collection.find.call_args.args[0]
    assert query["average_rating"] == {"$gte": threshold}
    assert query["review_count"] == {"$gt": 0}


def test_filter_options_are_sorted_and_ignore_blank_values(
        collection,
        database: Database,
):
    collection.distinct.side_effect = [
        ["Malay", "", "Chinese", None],
        ["Rice", "Noodles", "   "],
    ]

    result = get_restaurant_filter_options(database)

    assert result == {
        "cuisines": ["Chinese", "Malay"],
        "food_categories": ["Noodles", "Rice"],
    }

    collection.distinct.assert_any_call(
        "cuisines", {"visibility_status": "active"}
    )
    collection.distinct.assert_any_call(
        "food_categories", {"visibility_status": "active"}
    )