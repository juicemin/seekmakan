import argparse
import json
from datetime import datetime, timezone
from pathlib import Path

from bson import ObjectId
from pymongo.errors import PyMongoError

from app.database import get_database, close_database_connection
from app.schemas.restaurant import RestaurantCreate, RestaurantPhoto


PUBLIC_DIR = (
    Path(__file__).resolve().parents[2] / "frontend" / "public"
).resolve()


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("file", type=Path)
    parser.add_argument("--apply", action="store_true")
    args = parser.parse_args()

    with args.file.open(encoding="utf-8-sig") as file:
        entries = json.load(file)

    if not isinstance(entries, list) or not entries:
        raise ValueError("Expected a non-empty list of photo mappings.")

    # Validate all input and local files before database work.
    mappings = []
    seen_ids = set()

    for entry in entries:
        restaurant_id = ObjectId(entry["restaurant_id"])

        if restaurant_id in seen_ids:
            raise ValueError("Combine photos for the same restaurant in one entry.")

        seen_ids.add(restaurant_id)
        photos = [
            RestaurantPhoto.model_validate(photo).model_dump(mode="json")
            for photo in entry["photos"]
        ]

        if not photos:
            raise ValueError("Each mapping must contain at least one photo.")

        urls = [photo["url"] for photo in photos]

        if len(urls) != len(set(urls)):
            raise ValueError("Duplicate image paths in an input entry.")

        for photo in photos:
            image_path = (PUBLIC_DIR / photo["url"].lstrip("/")).resolve()

            if not image_path.is_relative_to(PUBLIC_DIR):
                raise ValueError("Image path is outside the public folder.")

            if not image_path.is_file():
                raise ValueError(f"Image file not found: {photo['url']}")

        mappings.append((restaurant_id, photos))

    try:
        database = get_database()
        collection = database["restaurants"]
        database.command("ping")

        print(f"Database: {database.name}")
        print("Mode:", "APPLY" if args.apply else "PREVIEW — NO WRITES")

        changes = []

        # Check every restaurant before applying any changes.
        for restaurant_id, incoming in mappings:
            restaurant = collection.find_one({"_id": restaurant_id})

            if restaurant is None:
                raise ValueError(f"Restaurant not found: {restaurant_id}")

            existing = restaurant.get("photos", [])

            if not isinstance(existing, list):
                raise ValueError("Existing photos field must be an array.")

            existing_by_url = {photo["url"]: photo for photo in existing}
            additions = []

            for photo in incoming:
                previous = existing_by_url.get(photo["url"])

                if previous is not None:
                    if previous != photo:
                        raise ValueError(
                            f"Existing photo has different metadata: {photo['url']}"
                        )
                    continue

                additions.append(photo)

            # Checks the final photo count and complete restaurant schema.
            RestaurantCreate.model_validate({
                **restaurant,
                "photos": existing + additions,
            })

            print(
                f"{restaurant['name']}: "
                f"{len(additions)} new, "
                f"{len(incoming) - len(additions)} already attached"
            )

            if additions:
                changes.append((restaurant, additions))

        if not args.apply:
            print("\nPreview complete. No database changes.")
            return

        for restaurant, additions in changes:
            # Avoid replacing photos changed since the preview inside this run.
            query = {"_id": restaurant["_id"]}

            if "photos" in restaurant:
                query["photos"] = restaurant["photos"]
            else:
                query["photos"] = {"$exists": False}

            result = collection.update_one(
                query,
                {
                    "$push": {"photos": {"$each": additions}},
                    "$set": {"updated_at": datetime.now(timezone.utc)},
                },
            )

            if result.matched_count != 1:
                raise RuntimeError(
                    "A restaurant changed during this run. "
                    "Earlier updates may have completed; rerun the preview."
                )

            print(f"UPDATED: {restaurant['name']}")

        print("\nFinished. Ratings, reviews and other restaurant fields unchanged.")

    except PyMongoError:
        raise SystemExit(
            "Database operation failed. Check Atlas connectivity. "
            "Earlier updates may have completed; rerun the preview."
        ) from None

    finally:
        close_database_connection()


if __name__ == "__main__":
    main()