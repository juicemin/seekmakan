import { useEffect, useRef, useState } from "react";
import RestaurantCard from "./RestaurantCard";

const COLORS = ["#fed7aa", "#bbf7d0", "#bfdbfe", "#e9d5ff"];

export default function RestaurantWheel({ items }) {
  const [options, setOptions] = useState(items);
  const [winner, setWinner] = useState(null);
  const [spinning, setSpinning] = useState(false);
  const [rotation, setRotation] = useState(0);

  const timerRef = useRef(null);
  const spinningRef = useRef(false);

  useEffect(() => {
    return () => window.clearTimeout(timerRef.current);
  }, []);

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

  function handleSpin() {
    if (spinningRef.current || options.length === 0) return;

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

    setOptions(current => current.filter(item => item.id !== winner.id));
    setWinner(null);
  }

  return (
    <section className="decision-wheel-panel" aria-label="Restaurant wheel">
      <h2>Choose a restaurant</h2>
      <p>{options.length} options remaining</p>

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
        disabled={spinning || options.length === 0}
      >
        {spinning ? "Spinning..." : winner ? "Spin again" : "Spin"}
      </button>

      <p role="status">
        {spinning
          ? "Choosing a restaurant..."
          : winner
            ? `Selected: ${winner.name}`
            : options.length === 0
              ? "No options remain. Load options again or change your filters."
              : "Ready to spin."}
      </p>

      {winner && (
        <div className="decision-winner">
          <RestaurantCard restaurant={winner} />
          <button type="button" onClick={handleRemove}>
            Remove from this wheel
          </button>
        </div>
      )}

      <details className="decision-options">
        <summary>View wheel options ({options.length})</summary>
        <ol>
          {options.map(item => (
            <li key={item.id}>{item.name}</li>
          ))}
        </ol>
      </details>
    </section>
  );
}