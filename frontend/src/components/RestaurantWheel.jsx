import { useEffect, useRef, useState } from "react";
import RestaurantCard from "./RestaurantCard";
import { useDecision } from "../context/decision-context";

const COLORS = ["#f3b9a2", "#dec1fe", "#b8dff9", "#fff9d5", "#f0c0f0", "#fe7777", "#c4fac1", "#c4b5fd"];

export default function RestaurantWheel() {
  const {
    pool,
    options,
    setOptions,
    winner,
    setWinner,
    rotation,
    setRotation,
    settings,
    clearManualRestaurants,
    setManualExcludedIds,
  } = useDecision();

  const [spinning, setSpinning] = useState(false);
  const timerRef = useRef(null);
  const spinningRef = useRef(false);

  useEffect(() => {
    return () => window.clearTimeout(timerRef.current);
  }, []);

  const availableRestaurants = pool ?? [];
  const selectedIds = new Set(options.map(item => item.id));

  const wheelNumbers = new Map(
    options.map((item, index) => [item.id, index + 1]),
  );

  const sliceAngle = options.length > 0 ? 360 / options.length : 360;

  const background = options.length
    ? `conic-gradient(${options
        .map(
          (_, index) =>
            `${COLORS[index % COLORS.length]} ${
              index * sliceAngle
            }deg ${(index + 1) * sliceAngle}deg`
        )
        .join(", ")})`
    : "#e5e7eb";

  function updateWheelOptions(nextOptions) {
    if (spinningRef.current) return;
    if (settings.source === "manual") {
      const nextSelectedIds = new Set(nextOptions.map(item => item.id));

      setManualExcludedIds(
        availableRestaurants
          .filter(item => !nextSelectedIds.has(item.id))
          .map(item => item.id),
      );
    }

    setOptions(nextOptions);
    setWinner(null);
    setRotation(0);
  }

  function handleToggleOption(restaurantId) {
    if (spinningRef.current) return;

    const nextSelectedIds = new Set(selectedIds);

    if (nextSelectedIds.has(restaurantId)) {
      nextSelectedIds.delete(restaurantId);
    } else {
      nextSelectedIds.add(restaurantId);
    }

    const nextOptions = availableRestaurants.filter(
      restaurant => nextSelectedIds.has(restaurant.id),
    );

    updateWheelOptions(nextOptions);
  }

  function handleSpin() {
    if (spinningRef.current || options.length < 2) return;

    spinningRef.current = true;
    setSpinning(true);
    setWinner(null);

    const index = Math.floor(Math.random() * options.length);
    const selected = options[index];

    // Place the selected segment's centre beneath the top pointer.
    const targetAngle = 360 - (index + 0.5) * sliceAngle;
    const currentAngle = ((rotation % 360) + 360) % 360;
    const adjustment = (targetAngle - currentAngle + 360) % 360;

    const reduceMotion = window.matchMedia(
      "(prefers-reduced-motion: reduce)"
    ).matches;

    setRotation(rotation + (reduceMotion ? 0 : 1440) + adjustment);

    timerRef.current = window.setTimeout(() => {
      setWinner(selected);
      setSpinning(false);
      spinningRef.current = false;
    }, reduceMotion ? 0 : 3200);
  }

  function handleRemove() {
    if (!winner || spinningRef.current) return;

    updateWheelOptions(
      options.filter(item => item.id !== winner.id),
    );
  }

  return (
    <section className="decision-wheel-panel" aria-label="Restaurant wheel">
      <h2>Choose a restaurant</h2>
      <p>
        {options.length} of {availableRestaurants.length} restaurants selected
      </p>

      <div className="decision-wheel-wrap" aria-hidden="true">
        <div className="decision-wheel-pointer" />

        <div
          className="decision-wheel"
          style={{
            background,
            transform: `rotate(${rotation}deg)`,
            transition: spinning
              ? "transform 3s cubic-bezier(0.12, 0.75, 0.15, 1)"
              : "none",
          }}
        >
          {options.length <= 20 &&
            options.map((item, index) => (
              <span
                key={item.id}
                className="decision-wheel-number"
                style={{
                  transform: `rotate(${
                    (index + 0.5) * sliceAngle
                  }deg)`,
                }}
              >
                <span>{index + 1}</span>
              </span>
            ))}
        </div>
      </div>

      <button
        type="button"
        onClick={handleSpin}
        disabled={spinning || options.length < 2}
      >
        {spinning ? "Spinning..." : winner ? "Spin again" : "Spin"}
      </button>

      <p role="status">
        {spinning
          ? "Choosing a restaurant..."
          : winner
            ? `Selected: ${winner.name}`
            : options.length < 2
              ? "Select at least two restaurants to spin."
              : "Ready to spin."}
      </p>

      {winner && (
        <div className="decision-winner">
          <RestaurantCard restaurant={winner} allowAddToWheel={false}/>
          <button type="button" onClick={handleRemove}>
            Uncheck this restaurant
          </button>
        </div>
      )}

      <details className="decision-options" open>
        <summary>
          Choose wheel options ({options.length}/{availableRestaurants.length})
        </summary>

        <fieldset className="wheel-selection" disabled={spinning}>
          <legend>Include restaurants in this spin</legend>

        <div className="wheel-selection__actions">
          <button
            type="button"
            onClick={() => updateWheelOptions([...availableRestaurants])}
            disabled={options.length === availableRestaurants.length}
          >
            Select all
          </button>

          <button
            type="button"
            onClick={() => updateWheelOptions([])}
            disabled={options.length === 0}
          >
            Uncheck all
          </button>

          {settings.source === "manual" && (
            <button
              type="button"
              onClick={() => {
                if (spinningRef.current) return;
                  clearManualRestaurants();
              }}
            >
              Clear collection
            </button>
          )}
        </div>

        <ul className="wheel-selection__list">
          {availableRestaurants.map(restaurant => {
            const checked = selectedIds.has(restaurant.id);
            const wheelNumber = wheelNumbers.get(restaurant.id);

            return (
              <li key={restaurant.id}>
                <label>
                <input
                  type="checkbox"
                  checked={checked}
                  onChange={() => handleToggleOption(restaurant.id)}
                />

                <span>
                  {checked && options.length <= 20 && (
                    <strong>{wheelNumber}. </strong>
                  )}
                  {restaurant.name}
                </span>
              </label>
            </li>
          );
        })}
      </ul>
    </fieldset>
  </details>
  </section>
  );
}