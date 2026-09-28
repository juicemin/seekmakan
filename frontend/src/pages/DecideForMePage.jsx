import { useEffect, useRef, useState } from "react";
import { getDecisionCandidates } from "../api/decisions";
import LocationPicker from "../components/LocationPicker";
import RestaurantWheel from "../components/RestaurantWheel";

export default function DecideForMePage() {
  const [location, setLocation] = useState(null);
  const [showPicker, setShowPicker] = useState(false);
  const [settings, setSettings] = useState({
    source: "nearby",
    radius: "5",
    price: "",
    rating: "",
    openNow: false,
  });

  const [pool, setPool] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const controllerRef = useRef(null);

  useEffect(() => {
    return () => controllerRef.current?.abort();
  }, []);

  function updateSetting(name, value) {
    setSettings(current => ({ ...current, [name]: value }));
    setPool(null);
    setError("");
  }

  async function handleLoad(event) {
    event.preventDefault();

    if (!location) {
      setError("Choose a location before loading wheel options.");
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
          price_range: settings.price || null,
          min_rating: settings.rating ? Number(settings.rating) : null,
          open_now: settings.openNow,
        },
        { signal: controller.signal }
      );

      if (controller.signal.aborted) return;

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
            </select>

            <button
              type="button"
              aria-expanded={showPicker}
              onClick={() => setShowPicker(value => !value)}
            >
              {showPicker ? "Close location picker" : "Choose location"}
            </button>

            {showPicker && (
              <LocationPicker
                initialLocation={location}
                onConfirm={value => {
                  setLocation(value);
                  setShowPicker(false);
                  setPool(null);
                  setError("");
                }}
              />
            )}

            <p role="status">
              {location
                ? `Selected location: ${location.latitude.toFixed(4)}, ${location.longitude.toFixed(4)}`
                : "No location selected."}
            </p>

            <label htmlFor="decision-distance">Distance</label>
            <select
              id="decision-distance"
              value={settings.radius}
              onChange={event => updateSetting("radius", event.target.value)}
            >
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

            <button type="submit" disabled={showPicker}>
              {loading ? "Loading..." : "Load wheel options"}
            </button>
          </fieldset>

          <p>
            Changing settings resets the wheel. Distance is measured
            in a straight line.
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
              No matching restaurants. Change your location, distance,
              or filters and try again.
            </p>
          )}

          {pool !== null && pool.length > 0 && (
            <RestaurantWheel items={pool} />
          )}
        </div>
      </div>
    </main>
  );
}