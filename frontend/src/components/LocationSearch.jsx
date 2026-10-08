import { useEffect, useId, useRef, useState } from "react";
import { searchLocations } from "../api/locations";

export default function LocationSearch({
  onSelect,
  resultHint = "Choose a result to move the map.",
}) {
  const inputId = useId();
  const controllerRef = useRef(null);

  const [query, setQuery] = useState("");
  const [items, setItems] = useState([]);
  const [status, setStatus] = useState("idle");
  const [error, setError] = useState("");

  useEffect(() => {
    return () => controllerRef.current?.abort();
  }, []);

  function handleChange(event) {
    // Ignore results from an older search after the text changes.
    controllerRef.current?.abort();
    setQuery(event.target.value);
    setItems([]);
    setStatus("idle");
    setError("");
  }

  async function handleSearch() {
    const text = query.trim();

    controllerRef.current?.abort();
    setItems([]);
    setError("");

    if (text.length < 3) {
      setStatus("error");
      setError("Enter at least 3 characters.");
      return;
    }

    const controller = new AbortController();
    controllerRef.current = controller;
    setStatus("loading");

    try {
      const data = await searchLocations(text, {
        signal: controller.signal,
      });

      if (controller.signal.aborted) return;

      setItems(data.items);
      setStatus("success");
    } catch (searchError) {
      if (controller.signal.aborted) return;

      setStatus("error");
      setError(searchError.message || "Unable to search locations.");
    }
  }

  function handleSelect(item) {
    controllerRef.current?.abort();
    setQuery(item.label);
    setItems([]);
    setStatus("idle");
    setError("");
    onSelect(item);
  }

  return (
    <div className="location-search">
      <label htmlFor={inputId}>Search a location in Malaysia</label>

      <div className="location-search__row">
        <input
          id={inputId}
          type="text"
          value={query}
          maxLength={150}
          placeholder="Town, area, or address"
          onChange={handleChange}
          onKeyDown={event => {
            if (event.key === "Enter") {
              event.preventDefault();

              if (status !== "loading") {
                handleSearch();
              }
            }
          }}
        />

        <button
          type="button"
          onClick={handleSearch}
          disabled={status === "loading"}
        >
          {status === "loading" ? "Searching…" : "Find location"}
        </button>
      </div>

      {error && <p role="alert">{error}</p>}

      <div role="status">
        {status === "success" && (
          <p>
            {items.length === 0
              ? "No locations found. Try adding a town or state."
              : resultHint}
          </p>
        )}
      </div>

      {items.length > 0 && (
        <ul className="location-search__results">
          {items.map((item, index) => (
            <li key={`${item.latitude}-${item.longitude}-${index}`}>
              <button type="button" onClick={() => handleSelect(item)}>
                {item.label}
              </button>
            </li>
          ))}
        </ul>
      )}

      <small>
        Powered by{" "}
        <a
          href="https://www.geoapify.com/"
          target="_blank"
          rel="noreferrer"
        >
          Geoapify
        </a>
        {" | "}
        <a
          href="https://www.openstreetmap.org/copyright"
          target="_blank"
          rel="noreferrer"
        >
          © OpenStreetMap contributors
        </a>
      </small>
    </div>
  );
}