import { useEffect, useState } from "react";
import { getRestaurantNameSuggestions } from "../api/submissions";

export default function RestaurantNameInput({
  value,
  onChange,
  onSelect,
}) {
  const [search, setSearch] = useState(true);
  const [items, setItems] = useState([]);
  const [status, setStatus] = useState("idle");
  const [error, setError] = useState("");

  useEffect(() => {
    if (!search || value.trim().length < 2) return;

    const controller = new AbortController();

    const timer = window.setTimeout(async () => {
      setStatus("loading");

      try {
        const result = await getRestaurantNameSuggestions(
          value.trim(),
          controller.signal
        );

        if (controller.signal.aborted) return;
        setItems(result.items);
        setStatus("success");
      } catch (failure) {
        if (controller.signal.aborted) return;
        setError(failure.message);
        setStatus("error");
      }
    }, 1100);

    return () => {
      window.clearTimeout(timer);
      controller.abort();
    };
  }, [value, search]);

  function dismissSuggestions() {
  setSearch(false);
  setItems([]);
  setStatus("idle");
  setError("");
}

  return (
    <section
        className="restaurant-name-input"
        onBlur={event => {
            if (!event.currentTarget.contains(event.relatedTarget)) {
                dismissSuggestions();
            }
        }}
    >
      <label htmlFor="submission-restaurant-name">
        Restaurant name *
      </label>

      <input
        id="submission-restaurant-name"
        value={value}
        minLength={2}
        maxLength={100}
        required
        autoComplete="off"
        placeholder="Type the restaurant name"
        onChange={event => {
          onChange(event.target.value);
          setSearch(true);
          setItems([]);
          setError("");
          setStatus("idle");
        }}
        onKeyDown={event => {
            if (event.key === "Enter") event.preventDefault();

            if (event.key === "Escape") {
                event.preventDefault();
                dismissSuggestions();
            }
        }}
      />

    {search && value.trim().length >= 2 && (
        <button type="button" onClick={dismissSuggestions}>
            Close suggestions — enter details manually
        </button>
    )}

    {!search && value.trim().length >= 2 && (
        <button type="button" onClick={() => setSearch(true)}>
            Show suggestions
        </button>
    )}

      {status === "loading" && (
        <p role="status">Finding suggestions…</p>
      )}

      {error && <p role="alert">{error}</p>}

      {search && status === "success" && items.length === 0 && (
        <p>No suggestions found. You can enter the details manually.</p>
      )}

      {search && items.length > 0 && (
        <ul className="contribution-lookup__results">
          {items.map(item => (
            <li key={item.provider_id}>
              <button
                type="button"
                onClick={() => {
                  setSearch(false);
                  setItems([]);
                  setStatus("idle");
                  setError("");
                  onSelect(item);
                }}
              >
                <strong>{item.name}</strong>
                <span>{item.full_address}</span>
              </button>
            </li>
          ))}
        </ul>
      )}

      <small>
        Select a suggestion to fill the address, or enter it manually.
        {" "}Suggestions by{" "}
        <a href="https://www.geoapify.com/" target="_blank" rel="noreferrer">
          Geoapify
        </a>
        {" · "}
        <a
          href="https://www.openstreetmap.org/copyright"
          target="_blank"
          rel="noreferrer"
        >
          © OpenStreetMap contributors
        </a>
      </small>
    </section>
  );
}