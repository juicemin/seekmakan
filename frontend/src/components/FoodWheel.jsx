import { useEffect, useRef, useState } from "react";
import { Link } from "react-router";
import { useDecision } from "../context/decision-context";

const COLORS = [
  "#f3b9a2", "#dec1fe", "#b8dff9", "#fff9d5",
  "#f0c0f0", "#fe7777", "#c4fac1", "#c4b5fd",
];

export default function FoodWheel() {
  const { foodDecision, setFoodDecision } = useDecision();
  const { pool, options, winner, rotation } = foodDecision;

  const [spinning, setSpinning] = useState(false);
  const [reduceMotion, setReduceMotion] = useState(false);
  const spinningRef = useRef(false);
  const timerRef = useRef(null);

  useEffect(() => {
    return () => window.clearTimeout(timerRef.current);
  }, []);

  const availableFoods = pool ?? [];
  const sliceAngle = options.length ? 360 / options.length : 360;

  const background = options.length
    ? `conic-gradient(${options.map((_, index) =>
        `${COLORS[index % COLORS.length]} ${
          index * sliceAngle
        }deg ${(index + 1) * sliceAngle}deg`
      ).join(", ")})`
    : "#e5e7eb";

  function changeSelection(nextOptions) {
    if (spinningRef.current) return;

    setFoodDecision(current => ({
      ...current,
      options: nextOptions,
      winner: null,
      rotation: 0,
    }));
  }

  function toggleFood(food) {
    const nextOptions = options.includes(food)
      ? options.filter(item => item !== food)
      : availableFoods.filter(
          item => item === food || options.includes(item),
        );

    changeSelection(nextOptions);
  }

  function handleSpin() {
    if (spinningRef.current || options.length < 2) return;

    spinningRef.current = true;

    const shouldReduceMotion = window.matchMedia(
      "(prefers-reduced-motion: reduce)",
    ).matches;

    setReduceMotion(shouldReduceMotion);
    setSpinning(true);

    const index = Math.floor(Math.random() * options.length);
    const selectedFood = options[index];

    // Rotate the winning slice's centre to the pointer at the top.
    const targetAngle = 360 - (index + 0.5) * sliceAngle;
    const currentAngle = ((rotation % 360) + 360) % 360;
    const adjustment = (targetAngle - currentAngle + 360) % 360;

    setFoodDecision(current => ({
      ...current,
      winner: null,
      rotation:
        rotation + (shouldReduceMotion ? 0 : 1440) + adjustment,
    }));

    timerRef.current = window.setTimeout(() => {
      setFoodDecision(current => ({
        ...current,
        winner: selectedFood,
      }));

      spinningRef.current = false;
      setSpinning(false);
    }, shouldReduceMotion ? 0 : 3200);
  }

    const winnerParams = new URLSearchParams();

    if (winner) {
      winnerParams.set("category", winner);
      winnerParams.set("from", "food-wheel");

    if (foodDecision.source === "nearby" && foodDecision.location) {
      winnerParams.set(
        "latitude",
        String(foodDecision.location.latitude),
      );
      winnerParams.set(
        "longitude",
        String(foodDecision.location.longitude),
      );
      winnerParams.set("radius_km", foodDecision.radius);
      winnerParams.set(
        "location_label",
        foodDecision.location.label || "Selected location",
      );
    }
  }

    const winnerQuery = winnerParams.toString();

  return (
    <section className="decision-wheel-panel" aria-label="Food wheel">
      <h2>Choose food</h2>
      <p>
        {options.length} of {availableFoods.length} foods selected
      </p>

      <div className="decision-wheel-wrap" aria-hidden="true">
        <div className="decision-wheel-pointer" />

        <div
          className="decision-wheel"
          style={{
            background,
            transform: `rotate(${rotation}deg)`,
            transition: spinning && !reduceMotion
              ? "transform 3s cubic-bezier(0.12, 0.75, 0.15, 1)"
              : "none",
          }}
        >
          {options.length <= 20 && options.map((food, index) => (
            <span
              key={food}
              className="decision-wheel-number"
              style={{
                transform: `rotate(${(index + 0.5) * sliceAngle}deg)`,
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
          ? "Choosing food..."
          : winner
            ? `Selected: ${winner}`
            : options.length < 2
              ? "Select at least two foods to spin."
              : "Ready to spin."}
      </p>

      {winner && !spinning && (
        <div className="decision-winner">
          <h3>{winner}</h3>

          <p>
            <Link to={`/food?${winnerQuery}`}>
              Find restaurants serving this
            </Link>
          </p>

          <button
            type="button"
            onClick={() => changeSelection(
              options.filter(food => food !== winner),
            )}
          >
            Uncheck this food
          </button>
        </div>
      )}

      <details className="decision-options" open>
        <summary>
          Choose wheel options ({options.length}/{availableFoods.length})
        </summary>

        <fieldset className="wheel-selection" disabled={spinning}>
          <legend>Include foods in this spin</legend>

          <div className="wheel-selection__actions">
            <button
              type="button"
              onClick={() => changeSelection([...availableFoods])}
              disabled={options.length === availableFoods.length}
            >
              Select all
            </button>

            <button
              type="button"
              onClick={() => changeSelection([])}
              disabled={options.length === 0}
            >
              Uncheck all
            </button>
          </div>

          <ul className="wheel-selection__list">
            {availableFoods.map(food => {
              const index = options.indexOf(food);
              const checked = index !== -1;

              return (
                <li key={food}>
                  <label>
                    <input
                      type="checkbox"
                      checked={checked}
                      onChange={() => toggleFood(food)}
                    />
                    <span>
                      {checked && options.length <= 20 && (
                        <strong>{index + 1}. </strong>
                      )}
                      {food}
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