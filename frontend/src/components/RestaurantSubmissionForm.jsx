import { useEffect, useRef, useState } from "react";
import LocationPicker from "./LocationPicker";
import { submitRestaurant } from "../api/submissions";
import ContributionTags from "./ContributionTags";
import { getRestaurantFilterOptions } from "../api/restaurants";
import SubmissionRestaurantInfo from "./SubmissionRestaurantInfo";
import RestaurantCandidatePicker from "./RestaurantCandidatePicker";

const DAYS = [
  "monday", "tuesday", "wednesday", "thursday",
  "friday", "saturday", "sunday",
];

export default function RestaurantSubmissionForm({
  onSubmitted,
  onSessionExpired,
  initialCandidate = null,
  initialArea = null,
}) {
    const [restaurantInfo, setRestaurantInfo] = useState(() => ({
        name: initialCandidate?.name ?? "",
        full_address: initialCandidate?.full_address ?? "",
        city: initialCandidate?.city ?? "",
        state: initialCandidate?.state ?? "",
        postcode: initialCandidate?.postcode ?? "",
    }));
    const [cuisines, setCuisines] = useState([]);
    const [foodCategories, setFoodCategories] = useState([]);
    const [tagOptions, setTagOptions] = useState({
        cuisines: [],
        food_categories: [],
    });
    const [optionsWarning, setOptionsWarning] = useState("");
    const [showRestaurantSearch, setShowRestaurantSearch] = useState(
        !initialCandidate
    );
    const [detailsReady, setDetailsReady] = useState(Boolean(initialCandidate));
    const [searchArea, setSearchArea] = useState(initialArea);
    
    useEffect(() => {
        const controller = new AbortController();

    getRestaurantFilterOptions({ signal: controller.signal })
        .then(result => {
            if (!controller.signal.aborted) {
                setTagOptions(result);
            }
        })
        .catch(() => {
            if (controller.signal.aborted) return;

            setOptionsWarning(
                "Existing options could not be loaded. You can still add the foods and cuisines you know."
            );
        });

    return () => controller.abort();
}, []);

    const [location, setLocation] = useState(() =>
    initialCandidate
      ? {
          latitude: initialCandidate.latitude,
          longitude: initialCandidate.longitude,
          label: initialCandidate.name,
        }
      : null
  );
  const [showMap, setShowMap] = useState(false);
  const [hours, setHours] = useState({});
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const submitting = useRef(false);
  const active = useRef(true);

  useEffect(() => {
    active.current = true;
    return () => {
      active.current = false;
    };
  }, []);

function updateHours(day, field, value) {
    setHours(current => ({
      ...current,
      [day]: {
        ...current[day],
        [field]: value,
      },
    }));
  }

function selectRestaurant(candidate, area) {
  setRestaurantInfo({
    name: candidate.name ?? "",
    full_address: candidate.full_address ?? "",
    city: candidate.city ?? "",
    state: candidate.state ?? "",
    postcode: candidate.postcode ?? "",
  });

  setLocation({
    latitude: candidate.latitude,
    longitude: candidate.longitude,
    label: candidate.name,
  });

  setSearchArea(area);
  setDetailsReady(true);
  setShowRestaurantSearch(false);
  setShowMap(false);
  setError("");
}

function enterManually(area) {
  setSearchArea(area);
  setDetailsReady(true);
  setShowRestaurantSearch(false);
  setShowMap(!location);
  setError("");
}

  async function handleSubmit(event) {
    event.preventDefault();

    if (!detailsReady || showRestaurantSearch) {
        setError("Select a restaurant or choose manual entry first.");
        return;
    }
    
    if (submitting.current) return;

    setError("");

    if (!location) {
      setError("Choose the restaurant’s exact location on the map.");
      return;
    }

    const form = event.currentTarget;
    const fields = new FormData(form);
    const read = name => String(fields.get(name) ?? "").trim();
    const info = Object.fromEntries(
        Object.entries(restaurantInfo).map(([key, value]) => [
            key,
            value.trim(),
        ])
    );

    const requiredFields = [
        ["name", 2, 100],
        ["full_address", 5, 300],
        ["city", 2, 100],
        ["state", 2, 100],
    ];

    if (
    requiredFields.some(
        ([key, minimum, maximum]) =>
        info[key].length < minimum || info[key].length > maximum
    ) ||
    (info.postcode && !/^[0-9]{5}$/.test(info.postcode))
) {
  setError("Check the restaurant name and address details before submitting.");
  return;
}

    const operatingHours = {};

    for (const day of DAYS) {
      const entry = hours[day];

      if (!entry?.status) continue;

      if (
        entry.status === "open" &&
        (!entry.open || !entry.close || entry.open === entry.close)
      ) {
        setError(
          `Check ${day}: enter different opening and closing times, or select Open 24 hours.`
        );
        return;
      }

      operatingHours[day] = {
        status: entry.status,
        open: entry.status === "open" ? entry.open : null,
        close: entry.status === "open" ? entry.close : null,
      };
    }

    if (
      cuisines.length > 20 ||
      foodCategories.length > 50 ||
      [...cuisines, ...foodCategories].some(tag => tag.length > 100)
    ) {
      setError(
        "Use at most 20 cuisines and 50 food categories, with no more than 100 characters per entry."
      );
      return;
    }

    const payload = {
      name: info.name,
      description: read("description") || null,
      address: {
        full_address: info.full_address,
        city: info.city,
        state: info.state,
        postcode: info.postcode || null,
    },
      location: {
        type: "Point",
        coordinates: [location.longitude, location.latitude],
      },
      cuisines,
      food_categories: foodCategories,
      price_range: read("price_range") || null,
      operating_hours: operatingHours,
    };

    submitting.current = true;
    setBusy(true);

    try {
      const result = await submitRestaurant(payload);
      if (!active.current) return;

      form.reset();
      setLocation(null);
      setHours({});
      setCuisines([]);
      setFoodCategories([]);
      setShowMap(false);
      onSubmitted(result.message);
    } catch (requestError) {
      if (!active.current) return;

      if (requestError.status === 401) {
        onSessionExpired();
      } else {
        setError(requestError.message);
      }
    } finally {
      submitting.current = false;
      if (active.current) setBusy(false);
    }
  }

  return (
    <form className="submission-form" onSubmit={handleSubmit}>
      <fieldset disabled={busy}>
        <legend>Restaurant information</legend>

        {showRestaurantSearch ? (
            <RestaurantCandidatePicker
                onSelect={selectRestaurant}
                onManual={enterManually}
            />
        ) : (
            <button
                type="button"
                onClick={() => setShowRestaurantSearch(true)}
            >
                Search for a different restaurant
            </button>
        )}

        {detailsReady && (
            <SubmissionRestaurantInfo
                value={restaurantInfo}
                onChange={setRestaurantInfo}
            />
        )}

        <details>
            <summary>Add a description — optional</summary>

            <label htmlFor="submission-description">
                Anything useful visitors should know?
            </label>

            <textarea
                id="submission-description"
                name="description"
                rows={3}
                maxLength={1000}
                placeholder="For example, a kopitiam with several food stalls."
            />
        </details>

        <p>
          Choose the restaurant’s exact position, not just its town centre.
        </p>

        <button
          type="button"
          aria-expanded={showMap}
          onClick={() => setShowMap(current => !current)}
        >
          {showMap
            ? "Close map"
            : location
                ? "Check or adjust restaurant location"
                : "Choose restaurant location"}
        </button>

        {location && (
          <p>
            Selected point: {location.latitude.toFixed(5)},{" "}
            {location.longitude.toFixed(5)}
          </p>
        )}

        {showMap && (
          <LocationPicker
            initialLocation={location ?? searchArea}
            onConfirm={selected => {
              setLocation(selected);
              setShowMap(false);
            }}
          />
        )}

        {optionsWarning && <p role="status">{optionsWarning}</p>}

        <ContributionTags
            label="Cuisines"
            options={tagOptions.cuisines}
            selected={cuisines}
            onChange={setCuisines}
            maxItems={20}
            disabled={busy}
        />

        <ContributionTags
            label="Foods served"
            options={tagOptions.food_categories}
            selected={foodCategories}
            onChange={setFoodCategories}
            maxItems={50}
            disabled={busy}
        />

        <label htmlFor="submission-price">Price range — optional</label>
        <select id="submission-price" name="price_range" defaultValue="">
          <option value="">Not known</option>
          <option value="RM1-RM20">RM1–RM20</option>
          <option value="RM21-RM50">RM21–RM50</option>
          <option value="RM51+">RM51+</option>
        </select>

        <details>
          <summary>Opening hours — optional</summary>

          <p>
            Leave unknown days as Not provided. A closing time earlier
            than opening means the restaurant closes the next day.
          </p>

          {DAYS.map(day => {
            const entry = hours[day] ?? {};
            const label = day[0].toUpperCase() + day.slice(1);

            return (
              <div className="submission-hours" key={day}>
                <label>
                  {label}
                  <select
                    value={entry.status ?? ""}
                    onChange={event =>
                      updateHours(day, "status", event.target.value)
                    }
                  >
                    <option value="">Not provided</option>
                    <option value="open">Open at specified times</option>
                    <option value="closed">Closed</option>
                    <option value="open_24_hours">Open 24 hours</option>
                  </select>
                </label>

                {entry.status === "open" && (
                  <>
                    <label>
                      Opens
                      <input
                        type="time"
                        value={entry.open ?? ""}
                        required
                        onChange={event =>
                          updateHours(day, "open", event.target.value)
                        }
                      />
                    </label>

                    <label>
                      Closes
                      <input
                        type="time"
                        value={entry.close ?? ""}
                        required
                        onChange={event =>
                          updateHours(day, "close", event.target.value)
                        }
                      />
                    </label>
                  </>
                )}
              </div>
            );
          })}
        </details>

        <label className="submission-confirmation">
          <input type="checkbox" required />
          <span>
            I have checked the address and map position, and the
            information is accurate to the best of my knowledge.
          </span>
        </label>

        <button
            type="submit"
            disabled={!detailsReady || showRestaurantSearch}
        >
            {busy ? "Submitting…" : "Submit restaurant"}
        </button>
      </fieldset>

      {error && <p role="alert">{error}</p>}
    </form>
  );
}