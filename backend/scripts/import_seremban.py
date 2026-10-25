import argparse
import hashlib
import json
import re
from pathlib import Path

from bson import ObjectId
from pymongo.errors import DuplicateKeyError, PyMongoError

from app.database import get_database, close_database_connection
from app.repositories.restaurant_repository import create_restaurant
from app.schemas.restaurant import RestaurantCreate


BACKEND_DIR = Path(__file__).resolve().parents[1]


def normalise(value: str) -> str:
    return re.sub(r"\W+", "", value.casefold())


def prepare_records(path: Path) -> list[dict]:
    with path.open(encoding="utf-8-sig") as file:
        package = json.load(file)

    records = package["records"]

    if not isinstance(records, list) or not records:
        raise ValueError("The import package is empty or invalid.")

    prepared = []
    seen_ids = set()

    for record in records:
        restaurant = RestaurantCreate.model_validate(record["restaurant"])
        provenance = record["provenance"]

        match_status = provenance.get("location_match_status")

        if (
            match_status not in {
                "address_matched",
                "manually_reviewed",
                "manually_supplied",
            }
            or provenance.get("business_verified") is not False
        ):
            raise ValueError("Unexpected provenance; review the input file.")

        if match_status == "manually_reviewed":
            approval = provenance.get("location_review")

            if not isinstance(approval, dict):
                raise ValueError("Manual location review is missing.")

            for field in (
                "candidate_place_id",
                "review_method",
                "review_note",
                "reviewed_on",
            ):
                value = approval.get(field)
                if not isinstance(value, str) or not value.strip():
                    raise ValueError(f"Missing manual-review field: {field}")

            if (
                approval["candidate_place_id"]
                != provenance.get("location_place_id")
                or approval.get("longitude")
                != restaurant.location.coordinates[0]
                or approval.get("latitude")
                != restaurant.location.coordinates[1]
            ):
                raise ValueError(
                    "Manual review does not match the prepared location."
                )

            if match_status == "manually_supplied":
                approval = provenance.get("location_review")

                if not isinstance(approval, dict):
                    raise ValueError("Manual location information is missing.")

                for field in ("source", "checked_on"):
                    value = approval.get(field)
                    if not isinstance(value, str) or not value.strip():
                        raise ValueError(f"Missing manual-location field: {field}")

                if (
                    approval.get("longitude")
                    != restaurant.location.coordinates[0]
                    or approval.get("latitude")
                    != restaurant.location.coordinates[1]
                    or approval.get("source")
                    != provenance.get("location_provider")
                ):
                    raise ValueError(
                        "Manual location does not match the prepared record."
                    )

        original_name = provenance["original_name"]

        # Stable identity for repeat runs of this curated import.
        identity = (
            "seekmakan-curated-v1|"
            + normalise(original_name)
            + "|"
            + normalise(restaurant.address.full_address)
        )
        digest = hashlib.sha256(identity.encode("utf-8")).hexdigest()
        document_id = ObjectId(digest[:24])

        if document_id in seen_ids:
            raise ValueError(f"Duplicate input: {restaurant.name}")

        seen_ids.add(document_id)

        prepared.append({
            "restaurant": restaurant.model_dump(mode="json"),
            "provenance": provenance,
            "_id": document_id,
            "import_key": digest,
        })

    return prepared


def possible_duplicate(record: dict, existing: dict) -> bool:
    incoming = record["restaurant"]

    names = {
        normalise(incoming["name"]),
        normalise(record["provenance"]["original_name"]),
    }

    if normalise(existing.get("name", "")) in names:
        return True

    incoming_address = normalise(incoming["address"]["full_address"])
    existing_address = normalise(
        existing.get("address", {}).get("full_address", "")
    )

    if incoming_address == existing_address:
        return True

    old_coordinates = existing.get("location", {}).get("coordinates")
    new_coordinates = incoming["location"]["coordinates"]

    if isinstance(old_coordinates, list) and len(old_coordinates) == 2:
        try:
            return all(
                abs(float(old) - float(new)) < 0.0001
                for old, new in zip(old_coordinates, new_coordinates)
            )
        except (TypeError, ValueError):
            return False

    return False


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("file", type=Path)
    parser.add_argument("--apply", action="store_true")
    args = parser.parse_args()

    # Validate the entire package before connecting or writing.
    prepared = prepare_records(args.file)

    try:
        database = get_database()
        database.command("ping")
        collection = database["restaurants"]

        print(f"Database: {database.name}")
        print("Mode:", "INSERT ONLY" if args.apply else "PREVIEW — NO WRITES")

        # Suitable for this small initial dataset.
        existing = list(collection.find({}, {
            "name": 1,
            "address": 1,
            "location": 1,
            "_import.key": 1,
        }))

        to_insert = []
        conflicts = []

        for record in prepared:
            name = record["restaurant"]["name"]

            already_imported = any(
                item["_id"] == record["_id"]
                or item.get("_import", {}).get("key") == record["import_key"]
                for item in existing
            )

            if already_imported:
                print(f"SKIP already imported: {name}")
                continue

            matches = [
                item for item in existing
                if possible_duplicate(record, item)
            ]

            if matches:
                conflicts.append(name)
                print(f"REVIEW possible duplicate: {name}")
                for match in matches:
                    print(f"  Existing: {match.get('name')} [{match['_id']}]")
            else:
                print(f"NEW: {name}")
                to_insert.append(record)

                # Also check subsequent input records against this one.
                existing.append({
                    **record["restaurant"],
                    "_id": record["_id"],
                    "_import": {"key": record["import_key"]},
                })

        if conflicts:
            print("\nStopped: resolve possible duplicates first.")
            print("No records were written by this run.")
            return

        if not args.apply:
            print(f"\nWould insert {len(to_insert)} restaurants.")
            print("No database changes were made.")
            return

        inserted = 0

        for record in to_insert:
            data = {
                **record["restaurant"],
                "_id": record["_id"],
                "_import": {
                    "key": record["import_key"],
                    "batch": args.file.name,
                    "provenance": record["provenance"],
                },
            }

            try:
                result = create_restaurant(database, data)
            except DuplicateKeyError:
                print(f"SKIP existing ID: {data['name']}")
                continue

            inserted += 1
            print(f"INSERTED: {result['name']} [{result['id']}]")

        print(f"\nInserted {inserted} restaurants.")
        print("Existing restaurants were not updated or deleted.")

    except PyMongoError:
        print(
            "\nDatabase operation failed. Check Atlas connectivity and access. "
            "If applying, earlier inserts may have succeeded; rerun the preview "
            "to check them. Connection credentials are not printed."
        )
        raise SystemExit(1) from None

    finally:
        close_database_connection()


if __name__ == "__main__":
    main()