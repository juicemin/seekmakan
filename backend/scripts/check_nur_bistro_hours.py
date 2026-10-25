from datetime import datetime

from app.database import get_database, close_database_connection
from app.repositories.opening_hours import (
    build_open_now_query,
    calculate_opening_status,
)
from app.schemas.restaurant import RestaurantCreate


CASES = [
    ("2026-10-23T00:15:00+08:00", "open"),
    ("2026-10-23T00:30:00+08:00", "closed"),
    ("2026-10-23T06:59:00+08:00", "closed"),
    ("2026-10-23T07:00:00+08:00", "open"),
    ("2026-10-23T11:59:00+08:00", "open"),
    ("2026-10-23T12:00:00+08:00", "closed"),
    ("2026-10-23T13:00:00+08:00", "closed"),
    ("2026-10-23T14:29:00+08:00", "closed"),
    ("2026-10-23T14:30:00+08:00", "open"),
    ("2026-10-23T23:59:00+08:00", "open"),
    ("2026-10-24T00:15:00+08:00", "open"),
    ("2026-10-24T00:30:00+08:00", "closed"),
    ("2026-10-24T07:00:00+08:00", "open"),
]


def main() -> None:
    try:
        collection = get_database()["restaurants"]

        matches = list(
            collection.find(
                {"name": "NUR BISTRO - NASI KANDAR ORIGINAL"}
            ).limit(2)
        )

        if len(matches) != 1:
            raise ValueError(
                "Expected exactly one NUR BISTRO record. "
                "Check its name and possible duplicates."
            )

        restaurant = matches[0]

        # Atlas edits bypass API validation, so check the saved record.
        RestaurantCreate.model_validate(restaurant)

        failures = 0

        for timestamp, expected in CASES:
            now = datetime.fromisoformat(timestamp)

            actual_status = calculate_opening_status(
                restaurant.get("operating_hours", {}),
                now,
            )

            query = {
                "$and": [
                    {"_id": restaurant["_id"]},
                    build_open_now_query(now),
                ]
            }

            found_by_filter = (
                collection.find_one(query, {"_id": 1}) is not None
            )

            passed = (
                actual_status == expected
                and found_by_filter == (expected == "open")
            )

            if not passed:
                failures += 1

            print(
                f"{'PASS' if passed else 'FAIL'} | {timestamp} | "
                f"expected={expected} | status={actual_status} | "
                f"filter_matches={found_by_filter}"
            )

        if failures:
            raise SystemExit(f"{failures} checks failed.")

        print(f"All {len(CASES)} checks passed. No database changes made.")

    finally:
        close_database_connection()


if __name__ == "__main__":
    main()