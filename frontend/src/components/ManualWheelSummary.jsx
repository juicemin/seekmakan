import { useId, useState } from "react";
import { useNavigate } from "react-router";
import { useDecision } from "../context/decision-context";

export default function ManualWheelSummary() {
  const navigate = useNavigate();
  const listId = useId();
  const [expanded, setExpanded] = useState(false);

  const {
    manualRestaurants,
    manualExcludedIds,
    setManualRestaurantChecked,
    loadManualWheel,
    removeManualRestaurant,
    clearManualRestaurants,
  } = useDecision();

  const selectedCount = manualRestaurants.filter(
    item => !manualExcludedIds.includes(item.id),
  ).length;

  if (manualRestaurants.length === 0) return null;

  function handleGoToWheel() {
    loadManualWheel({ preserveExisting: true });
    navigate("/decide");
  }

  function handleClearCollection() {
    setExpanded(false);
    clearManualRestaurants();
  }

  return (
    <aside
      className="manual-wheel-summary"
      aria-label="Your restaurant collection"
    >
      <div className="manual-wheel-summary__toolbar">
        <p role="status">
          {selectedCount}/{manualRestaurants.length} selected
        </p>

        {!expanded && (
          <button type="button" onClick={handleGoToWheel}>
            Go to wheel
          </button>
        )}

        <button
          type="button"
          className="manual-wheel-summary__toggle"
          aria-label={expanded ? "Hide collection" : "Show collection"}
          aria-expanded={expanded}
          aria-controls={listId}
          onClick={() => setExpanded(value => !value)}
        >
          <span aria-hidden="true">{expanded ? "▼" : "▲"}</span>
        </button>
      </div>

      <div id={listId} hidden={!expanded}>
        <ul className="manual-wheel-summary__list">
          {manualRestaurants.map(restaurant => (
            <li key={restaurant.id}>
              <label>
                <input
                  type="checkbox"
                  checked={!manualExcludedIds.includes(restaurant.id)}
                  onChange={event =>
                    setManualRestaurantChecked(
                      restaurant.id,
                      event.target.checked,
                    )
                  }
                />
                <span>{restaurant.name}</span>
              </label>

              <button
                type="button"
                onClick={() => removeManualRestaurant(restaurant.id)}
                aria-label={`Remove ${restaurant.name} from collection`}
              >
                Remove
              </button>
            </li>
          ))}
        </ul>

        {selectedCount < 2 && (
          <p className="manual-wheel-summary__hint">
            Select at least two restaurants to spin.
          </p>
        )}

        <div className="manual-wheel-summary__footer">
          <button type="button" onClick={handleClearCollection}>
            Clear collection
          </button>

          <button type="button" onClick={handleGoToWheel}>
            Go to wheel
          </button>
        </div>
      </div>
    </aside>
  );
}