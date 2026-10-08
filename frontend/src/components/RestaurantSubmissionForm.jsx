import { useEffect, useRef, useState } from "react";
import { submitRestaurant } from "../api/submissions";
import ContributionTags from "./ContributionTags";
import { getRestaurantFilterOptions } from "../api/restaurants";
import SubmissionRestaurantInfo from "./SubmissionRestaurantInfo";
import RestaurantNameInput from "./RestaurantNameInput";

const DAYS = [
  "monday", "tuesday", "wednesday", "thursday",
  "friday", "saturday", "sunday",
];

export default function RestaurantSubmissionForm({
  onSubmitted,
  onSessionExpired,
  initialName = "",
  initialCandidate = null,
}) {
    const [restaurantInfo, setRestaurantInfo] = useState(() => ({
        name: initialCandidate?.name ?? initialName,
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

function selectRestaurant(candidate) {
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

  setError("");
}

  async function handleSubmit(event) {
    event.preventDefault();

    if (submitting.current) return;

    setError("");

    const form = event.currentTarget;

    const invalidField = Array.from(form.elements).find(
        element => element.willValidate && !element.validity.valid
    );

    if (invalidField) {
        const section = invalidField.closest("details");
        if (section) section.open = true;

        const label =
            invalidField.labels?.[0]?.textContent?.trim() ||
            invalidField.name ||
            "A required field";

        setError(`${label}: ${invalidField.validationMessage}`);

        invalidField.focus();
        invalidField.scrollIntoView({
            behavior: "smooth",
            block: "center",
        });
        return;
    }

    const fields = new FormData(form);

    const read = name => String(fields.get(name) ?? "").trim();
    const info = Object.fromEntries(
        Object.entries(restaurantInfo).map(([key, value]) => [
            key,
            value.trim(),
        ])
    );

    const requiredFields = [
        ["name", "Restaurant name", 2, 100],
        ["full_address", "Full address", 5, 300],
        ["city", "City / town", 2, 100],
        ["state", "State", 2, 100],
    ];

    for (const [key, label, minimum, maximum] of requiredFields) {
        if (info[key].length < minimum || info[key].length > maximum) {
            setError(`${label} must contain ${minimum}–${maximum} characters.`);
            return;
        }
    }

    if (info.postcode && !/^[0-9]{5}$/.test(info.postcode)) {
        setError("Postcode must contain exactly 5 digits, or be left blank.");
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
    location: location
        ? {
            type: "Point",
            coordinates: [location.longitude, location.latitude],
        }   
        : null,
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
    <form
        className="submission-form"
        onSubmit={handleSubmit}
        noValidate
    >
      <fieldset disabled={busy}>
        <legend>Restaurant information</legend>

        <RestaurantNameInput
            value={restaurantInfo.name}
            onChange={name =>
                setRestaurantInfo(current => ({ ...current, name }))
            }
            onSelect={selectRestaurant}
        />

        <SubmissionRestaurantInfo
            value={restaurantInfo}
            onChange={setRestaurantInfo}
            onAddressSelected={selected => {
                setRestaurantInfo(current => ({
                    ...current,
                    full_address: selected.label,
                    city: selected.city ?? "",
                    state: selected.state ?? "",
                    postcode: selected.postcode ?? "",
                }));

                setLocation({
                    latitude: selected.latitude,
                    longitude: selected.longitude,
                    label: selected.label,
                });

                setError("");
            }}
        />

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

        {!location && (
            <p role="status">
                Map location hasn’t been identified. You can still submit the
                restaurant for review using its full address. Its location must
                be confirmed before publication.
            </p>
        )}

        <label className="submission-confirmation">
          <input type="checkbox" required />
          <span>
            I have checked the restaurant name and address, and the
            information is accurate to the best of my knowledge.
          </span>
        </label>

        {error && <p role="alert">{error}</p>}

        <button type="submit" disabled={busy}>
            {busy ? "Submitting…" : "Submit restaurant"}
        </button>
      </fieldset>

    </form>
  );
}