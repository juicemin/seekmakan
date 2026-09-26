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

    today_path = f"operating_hours.{today}"
    yesterday_path = f"operating_hours.{yesterday}"

    def scheduled_day(path: str) -> dict[str, Any]:
        return {
            # Support older records without an explicit status.
            "$or": [
                {f"{path}.status": "open"},
                {f"{path}.status": {"$exists": False}},
            ],
            f"{path}.open": {"$type": "string"},
            f"{path}.close": {"$type": "string"},
        }

    return {
        "$or": [
            # Open throughout today.
            {f"{today_path}.status": "open_24_hours"},

            # Normal same-day hours, example: 08:00–22:00.
            {
                "$and": [
                    scheduled_day(today_path),
                    {
                        f"{today_path}.open": {"$lte": current_time},
                        f"{today_path}.close": {"$gt": current_time},
                    },
                ]
            },

            # Today's overnight interval, before midnight.
            {
                "$and": [
                    scheduled_day(today_path),
                    {
                        f"{today_path}.open": {"$lte": current_time},
                        "$expr": {
                            "$lt": [
                                f"${today_path}.close",
                                f"${today_path}.open",
                            ]
                        },
                    },
                ]
            },

            # Yesterday's overnight interval, after midnight.
            {
                "$and": [
                    scheduled_day(yesterday_path),
                    {
                        f"{yesterday_path}.close": {"$gt": current_time},
                        "$expr": {
                            "$lt": [
                                f"${yesterday_path}.close",
                                f"${yesterday_path}.open",
                            ]
                        },
                    },
                ]
            },
        ]
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

    def is_scheduled(hours):
        return (
            hours is not None
            and hours.get("status", "open") == "open"
            and isinstance(hours.get("open"), str)
            and isinstance(hours.get("close"), str)
        )

    if today is not None:
        if today.get("status") == "open_24_hours":
            return "open"

        if is_scheduled(today):
            opening = today["open"]
            closing = today["close"]

            if opening < closing:
                if opening <= current_time < closing:
                    return "open"
            elif closing < opening:
                if current_time >= opening:
                    return "open"

    # A previous day's overnight interval may still be running.
    if yesterday is not None and is_scheduled(yesterday):
        if yesterday["close"] < yesterday["open"]:
            if current_time < yesterday["close"]:
                return "open"

    # Without both days, cannot confidently rule out an interval.
    if today is None or yesterday is None:
        return "unknown"

    return "closed"