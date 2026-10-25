from datetime import datetime, timedelta, timezone
from typing import Any
from typing import Literal

# Fixed UTC+8 for the current Malaysia-only scope.
MALAYSIA_TIME = timezone(timedelta(hours=8))

WEEKDAYS = (
    "monday",
    "tuesday",
    "wednesday",
    "thursday",
    "friday",
    "saturday",
    "sunday",
)


def build_open_now_query(now: datetime) -> dict[str, Any]:
    if now.tzinfo is None or now.utcoffset() is None:
        raise ValueError("An aware datetime is required.")

    local_now = now.astimezone(MALAYSIA_TIME)
    today = WEEKDAYS[local_now.weekday()]
    yesterday = WEEKDAYS[(local_now.weekday() - 1) % 7]
    current_time = local_now.strftime("%H:%M")

    today_path = f"$operating_hours.{today}"
    yesterday_path = f"$operating_hours.{yesterday}"

    def matching_period(path: str, previous_day: bool) -> dict[str, Any]:
        # Prefer the new periods list; otherwise use legacy open/close.
        periods = {
            "$cond": [
                {"$isArray": f"{path}.periods"},
                f"{path}.periods",
                [],
            ]
        }

        input_periods = {
            "$cond": [
                {"$gt": [{"$size": periods}, 0]},
                periods,
                [
                    {
                        "open": f"{path}.open",
                        "close": f"{path}.close",
                    }
                ],
            ]
        }

        if previous_day:
            # Yesterday's overnight period, after midnight.
            time_matches = {
                "$and": [
                    {"$lt": ["$$period.close", "$$period.open"]},
                    {"$gt": ["$$period.close", current_time]},
                ]
            }
        else:
            time_matches = {
                "$or": [
                    # Same-day period.
                    {
                        "$and": [
                            {"$lt": ["$$period.open", "$$period.close"]},
                            {"$lte": ["$$period.open", current_time]},
                            {"$gt": ["$$period.close", current_time]},
                        ]
                    },
                    # Today's overnight period, before midnight.
                    {
                        "$and": [
                            {"$lt": ["$$period.close", "$$period.open"]},
                            {"$lte": ["$$period.open", current_time]},
                        ]
                    },
                ]
            }

        return {
            "$and": [
                {
                    "$eq": [
                        {"$ifNull": [f"{path}.status", "open"]},
                        "open",
                    ]
                },
                {
                    "$anyElementTrue": [
                        {
                            "$map": {
                                "input": input_periods,
                                "as": "period",
                                "in": {
                                    "$and": [
                                        {
                                            "$eq": [
                                                {"$type": "$$period.open"},
                                                "string",
                                            ]
                                        },
                                        {
                                            "$eq": [
                                                {"$type": "$$period.close"},
                                                "string",
                                            ]
                                        },
                                        time_matches,
                                    ]
                                },
                            }
                        }
                    ]
                },
            ]
        }

    return {
        "$expr": {
            "$or": [
                {"$eq": [f"{today_path}.status", "open_24_hours"]},
                matching_period(today_path, previous_day=False),
                matching_period(yesterday_path, previous_day=True),
            ]
        }
    }

OpeningStatus = Literal["open", "closed", "unknown"]

def calculate_opening_status(
    operating_hours: dict[str, Any],
    now: datetime,
) -> OpeningStatus:
    if now.tzinfo is None or now.utcoffset() is None:
        raise ValueError("An aware datetime is required.")

    local_now = now.astimezone(MALAYSIA_TIME)
    current_time = local_now.strftime("%H:%M")

    today = operating_hours.get(WEEKDAYS[local_now.weekday()])
    yesterday = operating_hours.get(
        WEEKDAYS[(local_now.weekday() - 1) % 7]
    )

    def get_periods(hours: Any) -> list[dict[str, str]]:
        if not isinstance(hours, dict):
            return []

        if hours.get("status", "open") != "open":
            return []

        periods = hours.get("periods")

        # Existing records use open/close directly.
        if not isinstance(periods, list) or not periods:
            periods = [
                {
                    "open": hours.get("open"),
                    "close": hours.get("close"),
                }
            ]

        valid_periods: list[dict[str, str]] = []
        for period in periods:
            if not isinstance(period, dict):
                continue

            opening = period.get("open")
            closing = period.get("close")
            if (
                isinstance(opening, str)
                and isinstance(closing, str)
                and opening != closing
            ):
                valid_periods.append({"open": opening, "close": closing})

        return valid_periods

    if isinstance(today, dict):
        if today.get("status") == "open_24_hours":
            return "open"

    for period in get_periods(today):
        opening = period["open"]
        closing = period["close"]

        if opening < closing:
            # Same-day period: opening included, closing excluded.
            if opening <= current_time < closing:
                return "open"
        else:
            # Overnight period: today's portion before midnight.
            if current_time >= opening:
                return "open"

    for period in get_periods(yesterday):
        opening = period["open"]
        closing = period["close"]

        # Yesterday's overnight period may still be running today.
        if closing < opening and current_time < closing:
            return "open"

    # Preserve the existing rule for incomplete weekly schedules.
    if today is None or yesterday is None:
        return "unknown"

    return "closed"