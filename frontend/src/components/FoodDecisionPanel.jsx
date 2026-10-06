import { useEffect, useRef, useState } from "react";
import { getRestaurantFilterOptions } from "../api/restaurants";
import { getFoodDecisionCandidates } from "../api/decisions";
import { useDecision } from "../context/decision-context";
import LocationPicker from "./LocationPicker";
import FoodWheel from "./FoodWheel";

export default function FoodDecisionPanel() {
  const { foodDecision, setFoodDecision } = useDecision();
  const { source, location, radius, pool } = foodDecision;

  const [error, setError] = useState("");
  const [retry, setRetry] = useState(0);
  const [showPicker, setShowPicker] = useState(false);
  const [locating, setLocating] = useState(false);
  const [locationError, setLocationError] = useState("");
  const locationRequestRef = useRef(0);

  const isNearby = source === "nearby";
  const canLoad = !isNearby || location !== null;

  useEffect(() => {
    return () => {
      locationRequestRef.current += 1;
    };
  }, []);

  useEffect(() => {
    if (pool !== null || !canLoad) return;

    const controller = new AbortController();
    let active = true;

    async function loadFoods() {
      setError("");

      try {
        let foods;

        if (source === "nearby") {
          const data = await getFoodDecisionCandidates(
            {
              source: "nearby",
              latitude: location.latitude,
              longitude: location.longitude,
              radius_km: Number(radius),
            },
            { signal: controller.signal },
          );

          foods = data.items;
        } else {
          const data = await getRestaurantFilterOptions({
            signal: controller.signal,
          });

          foods = data.food_categories;
        }

        if (!active) return;

        const uniqueFoods = [...new Set(foods)].sort(
          (first, second) => first.localeCompare(second),
        );

        setFoodDecision(current => ({
          ...current,
          pool: uniqueFoods,
          options: uniqueFoods,
          winner: null,
          rotation: 0,
        }));
      } catch (requestError) {
        if (!active || requestError.name === "AbortError") return;
        setError(requestError.message);
      }
    }

    loadFoods();

    return () => {
      active = false;
      controller.abort();
    };
  }, [
    source,
    location,
    radius,
    pool,
    canLoad,
    retry,
    setFoodDecision,
  ]);

  function changeCriteria(changes) {
    // Ignore a pending geolocation response after another choice.
    locationRequestRef.current += 1;
    setLocating(false);
    setLocationError("");
    setError("");
    setShowPicker(false);

    setFoodDecision(current => ({
      ...current,
      ...changes,
      pool: null,
      options: [],
      winner: null,
      rotation: 0,
    }));
  }

  function useMyLocation() {
    if (!navigator.geolocation) {
      setLocationError(
        "Your browser does not support location access. Search for a location instead.",
      );
      return;
    }

    const requestId = ++locationRequestRef.current;
    setLocating(true);
    setLocationError("");
    setShowPicker(false);

    navigator.geolocation.getCurrentPosition(
      position => {
        if (requestId !== locationRequestRef.current) return;

        changeCriteria({
          location: {
            latitude: position.coords.latitude,
            longitude: position.coords.longitude,
            accuracy: position.coords.accuracy,
            label: "Your current location",
          },
        });
      },
      locationFailure => {
        if (requestId !== locationRequestRef.current) return;

        setLocating(false);
        setLocationError(
          locationFailure.code === 1
            ? "Location permission was denied. Search for a location instead."
            : "Could not get your location. Try again or search for a location.",
        );
      },
      {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 60000,
      },
    );
  }

  return (
    <main className="page discovery-page">
      <header className="page-header">
        <p className="eyebrow">SeekMakan</p>
        <h1>Decide what to eat</h1>
        <p>Choose foods, then let the wheel pick one.</p>
      </header>

      <div className="decision-layout">
        <section className="decision-setup" aria-label="Food search settings">
          <label htmlFor="food-wheel-source">Food options</label>
          <select
            id="food-wheel-source"
            value={source}
            onChange={event => changeCriteria({
              source: event.target.value,
            })}
          >
            <option value="all">All available foods</option>
            <option value="nearby">Nearby foods</option>
          </select>

          {isNearby ? (
            <>
              <p>
                Find foods served within your chosen straight-line distance.
              </p>

              <button
                type="button"
                onClick={useMyLocation}
                disabled={locating}
              >
                {locating ? "Getting location..." : "Use my location"}
              </button>

              <div>
                <label htmlFor="food-wheel-location">Location</label>
                <button
                  id="food-wheel-location"
                  type="button"
                  aria-expanded={showPicker}
                  onClick={() => {
                    locationRequestRef.current += 1;
                    setLocating(false);
                    setLocationError("");
                    setShowPicker(value => !value);
                  }}
                >
                  {showPicker ? "Close location picker" : "Search or choose on map"}
                </button>
              </div>

              {showPicker && (
                <LocationPicker
                  initialLocation={location}
                  onConfirm={value => changeCriteria({ location: value })}
                />
              )}

              {location && (
                <p role="status">
                  Selected location: {location.label || "Selected point"}
                </p>
              )}

              {locationError && <p role="alert">{locationError}</p>}

              <label htmlFor="food-wheel-radius">Distance</label>
              <select
                id="food-wheel-radius"
                value={radius}
                onChange={event => changeCriteria({
                  radius: event.target.value,
                })}
              >
                <option value="1">Within 1 km</option>
                <option value="3">Within 3 km</option>
                <option value="5">Within 5 km</option>
                <option value="10">Within 10 km</option>
                <option value="20">Within 20 km</option>
                <option value="50">Within 50 km</option>
              </select>

              {!location && (
                <p>Choose a location to load nearby foods.</p>
              )}
            </>
          ) : (
            <p>Includes food categories from all available restaurants.</p>
          )}

          <p>Changing these settings resets your food selections and winner.</p>
        </section>

        <div>
          {error && (
            <div role="alert">
              <p>Could not load food options: {error}</p>
              <button
                type="button"
                onClick={() => setRetry(value => value + 1)}
              >
                Try again
              </button>
            </div>
          )}

          {canLoad && pool === null && !error && (
            <p role="status">Loading food options...</p>
          )}

          {pool !== null && pool.length === 0 && (
            <p role="status">
              {isNearby
                ? "No food options were found here. Try another location or a larger distance."
                : "No food categories are available yet."}
            </p>
          )}

          {pool !== null && pool.length > 0 && !showPicker && !locating && (
            <FoodWheel />
          )}
        </div>
      </div>
    </main>
  );
}