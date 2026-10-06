import json
from datetime import datetime, timezone
from pathlib import Path

from app.schemas.restaurant import RestaurantCreate


BACKEND_DIR = Path(__file__).resolve().parents[1]
REVIEW_FILE = BACKEND_DIR / "data" / (
    "seremban-address-review-20261006T100245116686Z.json"
)

# Names and offerings supplied by the project owner.
# These are not independently verified restaurant listings.
DETAILS = {
    "Seremban Oakland Pork Noodle": {
        "name": "Seremban Oakland Pork Noodle",
        "description": "Serves pork noodles and coffee.",
        "food_categories": ["Pork Noodles"],
    },
    "美麗都茶餐室": {
        "name": "Restoran Melido / 美麗都茶餐室",
        "description": (
            "A Malaysian kopitiam with multiple food stalls. "
            "Offerings include yong tau foo, fried fish cakes, "
            "dry noodles and chicken rice."
        ),
        "food_categories": [
            "Yong Tau Foo", "Fish Cakes", "Noodles", "Chicken Rice",
        ],
    },
    "兄弟茶室-芙蓉森州": {
        "name": "Kedai Kopi & Makanan Saudara / 兄弟茶室",
        "description": (
            "A Malaysian kopitiam with multiple food stalls. "
            "Offerings include toast, Hakka mee, bagels, "
            "croissants and coffee."
        ),
        "food_categories": [
            "Toast", "Hakka Mee", "Bagels", "Croissants",
        ],
    },
    "Number One Top Curry House": {
        "name": "Number One Top Curry House",
        "description": "Serves banana leaf rice.",
        "food_categories": ["Banana Leaf Rice"],
    },
    "NUR BISTRO - NASI KANDAR ORIGINAL": {
        "name": "NUR BISTRO - NASI KANDAR ORIGINAL",
        "description": (
            "Serves cheese naan, Maggi goreng, "
            "nasi biryani and nasi kandar."
        ),
        "food_categories": [
            "Naan", "Instant Noodles", "Biryani", "Nasi Kandar",
        ],
    },
}


def main() -> None:
    with REVIEW_FILE.open(encoding="utf-8") as file:
        review = json.load(file)

    prepared = []
    used_names = set()

    for record in review["records"]:
        original_name = record["name"]

        if original_name not in DETAILS:
            continue

        if original_name in used_names:
            raise ValueError(f"Duplicate input: {original_name}")

        if record["review_status"] != "address_matched":
            raise ValueError(f"Address is unresolved: {original_name}")

        matches = [
            check["candidate"]
            for check in record["candidate_checks"]
            if check["status"] == "address_matched"
        ]

        if len(matches) != 1:
            raise ValueError(
                f"Expected one address match: {original_name}"
            )

        candidate = matches[0]
        details = DETAILS[original_name]

        restaurant = RestaurantCreate.model_validate({
            **details,
            "address": {
                "full_address": record["provided_address"],
                "city": "Seremban",
                "state": "Negeri Sembilan",
                "postcode": candidate["postcode"],
            },
            "location": {
                "type": "Point",
                "coordinates": [
                    candidate["lon"],
                    candidate["lat"],
                ],
            },
            "cuisines": [],
            "price_range": None,
            "operating_hours": {},
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
                "original_name": original_name,
                "business_details_source": "user_supplied",
                "location_provider": "geoapify",
                "location_place_id": candidate.get("place_id"),
                "location_datasource": candidate.get("datasource"),
                "location_match_status": "address_matched",
                "business_verified": False,
                "review_file": REVIEW_FILE.name,
            },
        })

        used_names.add(original_name)
        print(f"Prepared: {restaurant.name}")

    if used_names != set(DETAILS):
        missing = set(DETAILS) - used_names
        raise ValueError(f"Missing expected restaurants: {sorted(missing)}")

    now = datetime.now(timezone.utc)
    output = BACKEND_DIR / "data" / (
        f"seremban-import-ready-{now:%Y%m%dT%H%M%S%fZ}.json"
    )

    with output.open("x", encoding="utf-8") as file:
        json.dump(
            {
                "prepared_at": now.isoformat(),
                "records": prepared,
            },
            file,
            ensure_ascii=False,
            indent=2,
            allow_nan=False,
        )

    print(f"\nValidated {len(prepared)} restaurant records.")
    print(f"Saved: {output}")
    print("No API calls or database writes were made.")


if __name__ == "__main__":
    main()