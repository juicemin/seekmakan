import json
import math
import re
import sys
import argparse
from datetime import datetime, timezone
from pathlib import Path
from time import sleep
from urllib.error import HTTPError, URLError
from urllib.parse import urlencode
from urllib.request import urlopen

BACKEND_DIR = Path(__file__).resolve().parents[1]

def normalise(value: object) -> str:
    """Ignore case and spacing, but preserve street-number separators."""
    text = str(value or "").casefold()
    text = re.sub(r"[’']", "", text)
    return " ".join(text.split())


def expected_address(
    address: str,
    city: str = "Seremban",
) -> dict:
    """Extract address components for conservative matching."""
    house = re.match(r"^\s*(\d+[A-Za-z]?)\s*,", address)
    street = re.search(r"\bJalan\s+[^,]+", address, re.IGNORECASE)
    postcode = re.search(r"\b\d{5}\b", address)

    return {
        "housenumber": house.group(1) if house else "",
        "street": street.group(0).strip() if street else "",
        "postcode": postcode.group(0) if postcode else "",
        "city": city,
        "country_code": "my",
    }


def assess_candidate(expected: dict, candidate: dict) -> dict:
    reasons = []

    def result(status: str) -> dict:
        return {
            "status": status,
            "reasons": reasons,
            "candidate": candidate,
        }

    latitude = candidate.get("lat")
    longitude = candidate.get("lon")

    valid_coordinates = (
        isinstance(latitude, (int, float))
        and not isinstance(latitude, bool)
        and isinstance(longitude, (int, float))
        and not isinstance(longitude, bool)
        and math.isfinite(latitude)
        and math.isfinite(longitude)
        and -90 <= latitude <= 90
        and -180 <= longitude <= 180
    )

    if not valid_coordinates:
        reasons.append("Missing or invalid coordinates.")
        return result("rejected_candidate")

    if candidate.get("result_type") not in {"building", "amenity"}:
        reasons.append("Not a building or amenity-level result.")
        return result("rejected_candidate")

    missing = []
    conflicts = []

    for field, expected_value in expected.items():
        actual_value = candidate.get(field)

        if not expected_value or actual_value in (None, ""):
            missing.append(field)
        elif normalise(expected_value) != normalise(actual_value):
            conflicts.append(field)

    if conflicts:
        reasons.append("Conflicting fields: " + ", ".join(conflicts))
        return result("rejected_candidate")

    if missing:
        reasons.append("Insufficient fields: " + ", ".join(missing))
        return result("needs_review")

    reasons.append(
        "House number, street, postcode, city and country match. "
        "Restaurant occupancy is not verified."
    )
    return result("address_matched")


def fetch_candidates(
    expected: dict,
    address: str,
    api_key: str,
    state: str,
) -> list:
    parameters = {
        "apiKey": api_key,
        "format": "json",
        "filter": "countrycode:my",
        "limit": 5,
    }

    if expected["housenumber"] and expected["street"]:
        # Structured search avoids unrelated words in a long address.
        parameters.update({
            "housenumber": expected["housenumber"],
            "street": expected["street"],
            "city": expected["city"],
            "state": state,
            "country": "Malaysia",
        })

        if expected["postcode"]:
            parameters["postcode"] = expected["postcode"]
    else:
        # Do not guess a house number for incomplete/complex addresses.
        parameters["text"] = address + ", Malaysia"

    url = (
        "https://api.geoapify.com/v1/geocode/search?"
        + urlencode(parameters)
    )

    with urlopen(url, timeout=15) as response:
        payload = json.load(response)

    if (
        not isinstance(payload, dict)
        or not isinstance(payload.get("results"), list)
        or any(not isinstance(item, dict) for item in payload["results"])
    ):
        raise ValueError("Unexpected provider response.")

    return payload["results"]


def self_test() -> None:
    expected = expected_address(
        "5, Jalan Kong Sang, 70000 Seremban, Negeri Sembilan"
    )

    candidate = {
        **expected,
        "lat": 2.7284141,
        "lon": 101.9371514,
        "result_type": "building",
    }

    assert assess_candidate(expected, candidate)["status"] == "address_matched"

    assert assess_candidate(
        expected, {**candidate, "result_type": "city"}
    )["status"] == "rejected_candidate"

    assert assess_candidate(
        expected, {**candidate, "street": "Jalan Lain"}
    )["status"] == "rejected_candidate"

    assert assess_candidate(
        expected, {**candidate, "housenumber": None}
    )["status"] == "needs_review"

    assert assess_candidate(
        expected, {**candidate, "lat": float("nan")}
    )["status"] == "rejected_candidate"

    incomplete = expected_address(
        "Taman Unian, 70200 Seremban, Negeri Sembilan"
    )
    assert incomplete["housenumber"] == ""
    assert incomplete["street"] == ""

    print("6 offline checks passed. No API calls or database writes.")


def main() -> None:
    # Imported here so offline checks do not require application settings.
    from app.config import settings

    parser = argparse.ArgumentParser(
        description="Preview restaurant address matches without database writes."
    )
    parser.add_argument("file", type=Path)
    parser.add_argument("--city", required=True)
    parser.add_argument("--state", required=True)
    args = parser.parse_args()

    input_file = args.file.resolve()

    if not input_file.is_file():
        raise SystemExit(f"Input file not found: {input_file}")

    city = args.city.strip()
    state = args.state.strip()

    if not city or not state:
        raise SystemExit("City and state must not be blank.")

    api_key = settings.geoapify_api_key.get_secret_value()

    if not api_key:
        raise SystemExit("Geoapify API key is missing from backend settings.")

    with input_file.open(encoding="utf-8-sig") as file:
        targets = json.load(file)

    if not isinstance(targets, list) or not targets:
        raise SystemExit("Input must be a non-empty restaurant list.")

    for target in targets:
        if not isinstance(target, dict) or any(
            not isinstance(target.get(field), str)
            or not target[field].strip()
            for field in ("name", "address")
        ):
            raise SystemExit("Every record needs a name and address.")

    records = []

    for index, target in enumerate(targets, start=1):
        expected = expected_address(target["address"], city=city)
        checks = []
        error_message = None

        try:
            candidates = fetch_candidates(
                expected,
                target["address"],
                api_key,
                state=state,
            )
            checks = [
                assess_candidate(expected, candidate)
                for candidate in candidates
            ]

            matches = [
                item for item in checks
                if item["status"] == "address_matched"
            ]

            if len(matches) == 1:
                status = "address_matched"
            elif not checks:
                status = "no_results"
            else:
                status = "needs_review"

        except HTTPError as error:
            status = "lookup_failed"
            error_message = f"Provider returned HTTP {error.code}."

        except (URLError, TimeoutError, OSError, ValueError):
            status = "lookup_failed"
            error_message = "Provider unavailable or response invalid."

        records.append({
            "name": target["name"],
            "provided_address": target["address"],
            "expected_address": expected,
            "review_status": status,
            "approved_location": None,
            "error": error_message,
            "candidate_checks": checks,
        })

        print(f"{index}. {target['name']}: {status}")
        sleep(1.1)

    now = datetime.now(timezone.utc)

    review_directory = BACKEND_DIR / "data" / "lookup-reviews"
    review_directory.mkdir(parents=True, exist_ok=True)

    output = review_directory / (
        f"{input_file.stem}-review-{now:%Y%m%dT%H%M%S%fZ}.json"
    )

    with output.open("x", encoding="utf-8") as file:
        json.dump(
            {
                "generated_at": now.isoformat(),
                "provider": "geoapify",
                "records": records,
                "input_file": input_file.name,
                "city": city,
                "state": state,
            },
            file,
            ensure_ascii=False,
            indent=2,
            allow_nan=False,
        )

    print(f"\nSaved: {output}")
    print("No database writes. No restaurant marked as verified.")


if __name__ == "__main__":
    if "--self-test" in sys.argv:
        self_test()
    else:
        main()