from datetime import datetime

import pytest

from app.repositories.opening_hours import calculate_opening_status


@pytest.mark.parametrize(
    "timestamp, expected",
    [
        ("2026-09-28T17:59:00+08:00", "closed"),
        ("2026-09-28T18:00:00+08:00", "open"),
        ("2026-09-28T23:59:00+08:00", "open"),
        ("2026-09-29T00:00:00+08:00", "open"),
        ("2026-09-29T00:30:00+08:00", "open"),
        ("2026-09-29T01:00:00+08:00", "closed"),
        # Same instant as Tuesday 00:30 in Malaysia.
        ("2026-09-28T16:30:00+00:00", "open"),
    ],
)
def test_overnight_status(timestamp, expected):
    hours = {
        "sunday": {"status": "closed"},
        "monday": {
            "status": "open",
            "open": "18:00",
            "close": "01:00",
        },
        "tuesday": {"status": "closed"},
    }

    assert calculate_opening_status(
        hours, datetime.fromisoformat(timestamp)
    ) == expected


@pytest.mark.parametrize(
    "hour, expected",
    [(7, "closed"), (8, "open"), (21, "open"), (22, "closed")],
)
def test_normal_hours_and_legacy_status(hour, expected):
    hours = {
        "sunday": {"status": "closed"},
        "monday": {"open": "08:00", "close": "22:00"},
    }
    now = datetime.fromisoformat(
        f"2026-09-28T{hour:02d}:00:00+08:00"
    )

    assert calculate_opening_status(hours, now) == expected


def test_midnight_closing():
    hours = {
        "monday": {"open": "18:00", "close": "00:00"},
        "tuesday": {"status": "closed"},
    }
    now = datetime.fromisoformat("2026-09-29T00:00:00+08:00")

    assert calculate_opening_status(hours, now) == "closed"


def test_open_24_hours():
    hours = {"monday": {"status": "open_24_hours"}}
    now = datetime.fromisoformat("2026-09-28T03:00:00+08:00")

    assert calculate_opening_status(hours, now) == "open"


def test_missing_hours():
    now = datetime.fromisoformat("2026-09-28T12:00:00+08:00")

    assert calculate_opening_status({}, now) == "unknown"


def test_missing_previous_day_is_not_assumed_closed():
    hours = {"monday": {"status": "closed"}}
    now = datetime.fromisoformat("2026-09-28T00:30:00+08:00")

    assert calculate_opening_status(hours, now) == "unknown"