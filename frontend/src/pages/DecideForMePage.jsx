import { useEffect, useRef, useState } from "react";
import { getDecisionCandidates } from "../api/decisions";
import LocationPicker from "../components/LocationPicker";
import RestaurantWheel from "../components/RestaurantWheel";
import { useDecision } from "../context/decision-context";
import { Link, useSearchParams } from "react-router";
import FoodDecisionPanel from "../components/FoodDecisionPanel";

function RestaurantDecisionPanel() {
  const [showPicker, setShowPicker] = useState(false);
  const {
  location,
  setLocation,
  settings,
  setSettings,
  pool,
  setPool,
  setOptions,
  setWinner,
  setRotation,
  manualRestaurants,
  loadManualWheel,
} = useDecision();
  const isManualSource = settings.source === "manual";
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const controllerRef = useRef(null);
  const [locating, setLocating] = useState(false);
  const [locationError, setLocationError] = useState("");
  const locationRequestRef = useRef(0);

  useEffect(() => {
    return () => {
      controllerRef.current?.abort();
      locationRequestRef.current += 1;
    };
  }, []);

  function selectLocation(value) {
    locationRequestRef.current += 1;

    setLocation(value);
    setLocating(false);
    setLocationError("");
    setShowPicker(false);
    setError("");

    // Existing options belong to the previous search location.
    setPool(null);
    setOptions([]);
    setWinner(null);
    setRotation(0);
  }

  function handleUseMyLocation() {
    const requestId = ++locationRequestRef.current;

    setLocationError("");
    setShowPicker(false);

    if (!navigator.geolocation) {
      setLocating(false);
      setLocationError(
        "Location access is unavailable. Search for a location instead.",
      );
      return;
    }

    setLocating(true);

    navigator.geolocation.getCurrentPosition(
      position => {
        if (requestId !== locationRequestRef.current) return;

        selectLocation({
          latitude: position.coords.latitude,
          longitude: position.coords.longitude,
          accuracy: position.coords.accuracy,
          label: "Your current location",
        });
      },
      locationFailure => {
        if (requestId !== locationRequestRef.current) return;

        setLocating(false);

        const messages = {
          1: "Location permission was denied. Search or choose on the map instead.",
          2: "Your location could not be determined. Try again or choose it manually.",
          3: "Location lookup timed out. Try again or choose it manually.",
        };

        setLocationError(
          messages[locationFailure.code] || "Unable to access your location.",
        );
      },
      {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 60000,
      },
    );
  }

  function updateSetting(name, value) {
    if (name === "source") {
      locationRequestRef.current += 1;
      setLocating(false);
      setLocationError("");
      setShowPicker(false);
    }

    setSettings(current => ({ ...current, [name]: value }));
    setPool(null);
    setOptions([]);
    setWinner(null);
    setRotation(0);
    setError("");
  }

  async function handleLoad(event) {
    event.preventDefault();

    if (loading) return;

    if (isManualSource) {
      loadManualWheel();
      setError("");
      return;
    }

    if (!location) {
      setError("Choose a location before loading nearby options.");
      return;
    }

    if (locating || showPicker) {
      setLocationError(
        "Finish choosing your location before loading wheel options.",
      );
      return;
    }

    if (settings.radius === "") {
      setError("Choose a distance before loading nearby options.");
      return;
    }

    controllerRef.current?.abort();
    const controller = new AbortController();
    controllerRef.current = controller;

    setLoading(true);
    setPool(null);
    setError("");

    try {
      const data = await getDecisionCandidates(
        {
          source: settings.source,
          latitude: location.latitude,
          longitude: location.longitude,
          radius_km: Number(settings.radius),
          search: settings.search,
          cuisines: settings.cuisines,
          food_categories: settings.foodCategories,
          price_range: settings.price || null,
          min_rating: settings.rating ? Number(settings.rating) : null,
          open_now: settings.openNow,
        },
        { signal: controller.signal }
      );

      if (controller.signal.aborted) return;

      setOptions(data.items);
      setWinner(null);
      setRotation(0);
      setPool(data.items);

    } catch (requestError) {
      if (controller.signal.aborted) return;
      setError(requestError.message);
    } finally {
      if (!controller.signal.aborted) {
        setLoading(false);
      }
    }
  }

  const discoveryFilterLabels = [
    ...(settings.search ? [`Search: ${settings.search}`] : []),
    ...settings.cuisines.map(value => `Cuisine: ${value}`),
    ...settings.foodCategories.map(value => `Food: ${value}`),
  ];

  function clearDiscoveryFilters() {
    setSettings(current => ({
      ...current,
      search: "",
      cuisines: [],
      foodCategories: [],
    }));

    setPool(null);
    setOptions([]);
    setWinner(null);
    setRotation(0);
    setError("");
  }

  return (
    <main className="page discovery-page">
      <header className="page-header">
        <p className="eyebrow">SeekMakan</p>
        <h1>Decide For Me</h1>
        <p>Choose an area and let the wheel pick a restaurant.</p>
      </header>

      <div className="decision-layout">
        <form className="decision-setup" onSubmit={handleLoad}>
          <fieldset disabled={loading}>
            <legend>Restaurant wheel settings</legend>

            <label htmlFor="decision-source">Spin from</label>
            <select
              id="decision-source"
              value={settings.source}
              onChange={event => updateSetting("source", event.target.value)}
            >
              <option value="nearby">Nearby Options</option>
              <option value="hidden_gems">Hidden Gems</option>
              <option value="manual">My selections ({manualRestaurants.length})</option>
            </select>

            {!isManualSource && discoveryFilterLabels.length > 0 && (
              <section className="filter-summary" aria-label="Discovery filters">
                <strong>From discovery</strong>

                <ul className="filter-summary__items">
                  {discoveryFilterLabels.map(label => (
                    <li key={label}>{label}</li>
                  ))}
                </ul>

                <button type="button" onClick={clearDiscoveryFilters}>
                  Clear discovery filters
                </button>
              </section>
            )}

            {isManualSource ? (
              <p>
                These are the restaurants you added from discovery.
                Location and nearby filters do not apply to this collection.
                Choose at least two in the wheel checklist.
              </p>
            ) : (
              <>

            <button
              type="button"
              onClick={handleUseMyLocation}
              disabled={locating}
            >
              {locating ? "Finding location…" : "Use my location"}
            </button>

            <div className="location-picker-control">
              <span className="location-picker-control__label">Location</span>

              <button
                type="button"
                aria-expanded={showPicker}
                onClick={() => {
                  locationRequestRef.current += 1;
                  setLocating(false);
                  setLocationError("");
                  setShowPicker(value => !value);
                }}
              >
                {showPicker
                  ? "Close location picker"
                  : "Search or choose on map"}
              </button>
            </div>

            {locating && <p role="status">Finding your current location…</p>}

            {locationError && <p role="alert">{locationError}</p>}

            {showPicker && (
              <LocationPicker
                initialLocation={location}
                onConfirm={selectLocation}
              />
            )}

            <p role="status">
              {location
                ? `Selected location: ${location.label || "Selected map location"}`
                : "No location selected."}

              {location?.accuracy != null &&
                ` — estimated accuracy ${Math.round(location.accuracy)} m`}
            </p>

            <label htmlFor="decision-distance">Distance</label>
            <select
              id="decision-distance"
              value={settings.radius}
              onChange={event => updateSetting("radius", event.target.value)}
            >
              <option value="" disabled>
                Choose distance
              </option>

              {[1, 3, 5, 10, 25, 50].map(distance => (
                <option key={distance} value={distance}>
                  Within {distance} km
                </option>
              ))}
            </select>

            <label htmlFor="decision-price">Price range</label>
            <select
              id="decision-price"
              value={settings.price}
              onChange={event => updateSetting("price", event.target.value)}
            >
              <option value="">Any price</option>
              <option value="RM1-RM20">RM1–RM20</option>
              <option value="RM21-RM50">RM21–RM50</option>
              <option value="RM51+">RM51+</option>
            </select>

            <label htmlFor="decision-rating">Rating</label>
            <select
              id="decision-rating"
              value={settings.rating}
              onChange={event => updateSetting("rating", event.target.value)}
            >
              <option value="">Any rating</option>
              <option value="3">3 stars and above</option>
              <option value="4">4 stars and above</option>
              <option value="4.5">4.5 stars and above</option>
            </select>

            <label className="decision-checkbox">
              <input
                type="checkbox"
                checked={settings.openNow}
                onChange={event =>
                  updateSetting("openNow", event.target.checked)
                }
              />
              Open now
            </label>
          </>
        )}

            <button
              type="submit"
              disabled={!isManualSource && (showPicker || locating)}
            >
              {loading
                ? "Loading..."
                : isManualSource
                  ? "Load my selections"
                  : "Load wheel options"}
            </button>
          </fieldset>

          <p>
            {isManualSource
              ? "Loading your selections starts a new wheel. Your collection is kept while navigating, but resets on a browser refresh."
              : "Changing settings resets the wheel. Distance is measured in a straight line."}
          </p>

          {error && <p role="alert">{error}</p>}
        </form>

        <div>
          {loading && <p role="status">Loading matching restaurants...</p>}

          {!loading && pool === null && (
            <p>Choose your settings, then load the wheel options.</p>
          )}

          {pool !== null && pool.length === 0 && (
            <p role="status">
              {isManualSource
                ? "No manual selections yet. Add restaurants from Restaurant Discovery or Food Discovery."
                : "No matching restaurants. Change your location, distance, or filters and try again."}
            </p>
          )}

          {pool !== null && pool.length > 0 && (
            <RestaurantWheel />
          )}
        </div>
      </div>
    </main>
  );
}

export default function DecideForMePage() {
  const [searchParams] = useSearchParams();
  const isFoodMode = searchParams.get("mode") === "food";

  return (
    <>
      <nav aria-label="Decision mode">
        <Link
          to="/decide"
          aria-current={!isFoodMode ? "page" : undefined}
        >
          Choose a restaurant
        </Link>
        {" | "}
        <Link
          to="/decide?mode=food"
          aria-current={isFoodMode ? "page" : undefined}
        >
          Choose food
        </Link>
      </nav>

      {isFoodMode ? <FoodDecisionPanel /> : <RestaurantDecisionPanel />}
    </>
  );
}