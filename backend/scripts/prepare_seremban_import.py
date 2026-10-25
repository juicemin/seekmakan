import argparse
import json
import math
from datetime import datetime, timezone
from pathlib import Path

from app.schemas.restaurant import RestaurantCreate


BACKEND_DIR = Path(__file__).resolve().parents[1]

DETAIL_FIELDS = (
    "description",
    "cuisines",
    "food_categories",
    "price_range",
    "operating_hours",
    "photos",
)


def read_json(path: Path):
    with path.open(encoding="utf-8-sig") as file:
        return json.load(file)


def index_by_name(records: list, label: str) -> dict:
    indexed = {}

    for record in records:
        if not isinstance(record, dict):
            raise ValueError(f"{label}: each record must be an object.")

        name = record.get("name")

        if not isinstance(name, str) or not name.strip():
            raise ValueError(f"{label}: each record needs a name.")

        if name in indexed:
            raise ValueError(f"{label}: duplicate name: {name}")

        indexed[name] = record

    return indexed


def main() -> None:
    parser = argparse.ArgumentParser(
        description="Prepare validated restaurant records without database writes."
    )
    parser.add_argument("targets", type=Path)
    parser.add_argument("review", type=Path)
    parser.add_argument("--city", required=True)
    parser.add_argument("--state", required=True)
    args = parser.parse_args()

    city = args.city.strip()
    state = args.state.strip()

    if not city or not state:
        raise ValueError("City and state must not be blank.")

    targets = read_json(args.targets)
    review = read_json(args.review)

    if not isinstance(targets, list) or not targets:
        raise ValueError("Targets must be a non-empty list.")

    if (
        not isinstance(review, dict)
        or not isinstance(review.get("records"), list)
    ):
        raise ValueError("Review file must contain a records list.")

    # Newer review files include their lookup area.
    for field, expected in (("city", city), ("state", state)):
        recorded = review.get(field)
        if recorded is not None and recorded != expected:
            raise ValueError(f"Review file has a different {field}.")

    target_index = index_by_name(targets, "Targets")
    review_index = index_by_name(review["records"], "Review")

    prepared = []
    skipped = []

    for name, target in target_index.items():
        address = target.get("address")

        if not isinstance(address, str) or not address.strip():
            raise ValueError(f"Missing address: {name}")

        manual_location = target.get("manual_location")

        if manual_location is not None:
            if not isinstance(manual_location, dict):
                raise ValueError(f"Invalid manual_location: {name}")

            latitude = manual_location.get("latitude")
            longitude = manual_location.get("longitude")

            for label, value, minimum, maximum in (
                ("latitude", latitude, -90, 90),
                ("longitude", longitude, -180, 180),
            ):
                if (
                    isinstance(value, bool)
                    or not isinstance(value, (int, float))
                    or not math.isfinite(value)
                    or not minimum <= value <= maximum
                ):
                    raise ValueError(f"Invalid {label}: {name}")

            for field in ("source", "checked_on"):
                value = manual_location.get(field)
                if not isinstance(value, str) or not value.strip():
                    raise ValueError(
                        f"Manual location needs {field}: {name}"
                    )

            candidate = {
                "lat": latitude,
                "lon": longitude,
                "postcode": target.get("postcode"),
            }
            approval = dict(manual_location)
            location_match_status = "manually_supplied"

        else:    

            record = review_index.get(name)

            if record is None:
                reason = "No saved lookup result."
                skipped.append({"name": name, "reason": reason})
                print(f"SKIP: {name} — {reason}")
                continue

            if record.get("provided_address") != address:
                reason = "Address changed since lookup; run a new lookup."
                skipped.append({"name": name, "reason": reason})
                print(f"SKIP: {name} — {reason}")
                continue

            approval = record.get("approved_location")
            location_match_status = "address_matched"

            if approval is not None:
                if not isinstance(approval, dict):
                    raise ValueError(f"Invalid location approval: {name}")

                required_text = (
                    "candidate_place_id",
                    "review_method",
                    "review_note",
                    "reviewed_on",
                )

                if any(
                    not isinstance(approval.get(field), str)
                    or not approval[field].strip()
                    for field in required_text
                ):
                    raise ValueError(f"Incomplete location approval: {name}")

                matches = [
                    check["candidate"]
                    for check in record.get("candidate_checks", [])
                    if check["candidate"].get("place_id")
                    == approval["candidate_place_id"]
                ]

                if len(matches) != 1:
                    raise ValueError(
                        f"Approved candidate ID is missing or ambiguous: {name}"
                    )

                candidate = matches[0]

                if (
                    approval.get("latitude") != candidate.get("lat")
                    or approval.get("longitude") != candidate.get("lon")
                ):
                    raise ValueError(
                        f"Approved coordinates differ from the candidate: {name}"
                    )

                location_match_status = "manually_reviewed"

            else:
                matches = [
                    check["candidate"]
                    for check in record.get("candidate_checks", [])
                    if check.get("status") == "address_matched"
                ]

                if (
                    record.get("review_status") != "address_matched"
                    or len(matches) != 1
                ):
                    reason = "Location still needs review."
                    skipped.append({"name": name, "reason": reason})
                    print(f"SKIP: {name} — {reason}")
                    continue

                candidate = matches[0]

        details = {
            field: target[field]
            for field in DETAIL_FIELDS
            if field in target
        }

        restaurant = RestaurantCreate.model_validate({
            **details,
            "name": target.get("display_name", name),
            "address": {
                "full_address": address,
                "city": city,
                "state": state,
                "postcode": candidate.get("postcode") or None,
            },
            "location": {
                "type": "Point",
                "coordinates": [
                    candidate["lon"],
                    candidate["lat"],
                ],
            },
            "verification_status": "seeded",
            "source": {
                "type": "manual",
                "external_id": None,
                "last_checked_at": None,
            },
        })

        prepared.append({
            "restaurant": restaurant.model_dump(mode="json"),
            "provenance": {
                "original_name": name,
                "business_details_source": target.get(
                    "information_source", "user_supplied"
                ),
                "information_checked_on": target.get(
                    "information_checked_on"
                ),
                "location_provider": (
                    manual_location["source"]
                    if manual_location is not None
                    else review.get("provider")
                ),
                "location_place_id": candidate.get("place_id"),
                "location_datasource": candidate.get("datasource"),
                "location_match_status": location_match_status,
                "location_review": approval,
                "business_verified": False,
                "review_file": (
                    None if manual_location is not None else args.review.name
                ),
                "targets_file": args.targets.name,
            },
        })

        print(f"PREPARED: {restaurant.name}")

    now = datetime.now(timezone.utc)
    output = BACKEND_DIR / "data" / (
        f"{args.targets.stem}-prepared-{now:%Y%m%dT%H%M%S%fZ}.json"
    )

    with output.open("x", encoding="utf-8") as file:
        json.dump(
            {
                "prepared_at": now.isoformat(),
                "records": prepared,
                "skipped": skipped,
            },
            file,
            ensure_ascii=False,
            indent=2,
            allow_nan=False,
        )

    print(f"\nPrepared: {len(prepared)}; skipped: {len(skipped)}")
    print(f"Saved: {output}")
    print("No API calls or database writes were made.")

    if not prepared:
        print("Nothing is ready to import yet.")


if __name__ == "__main__":
    main()