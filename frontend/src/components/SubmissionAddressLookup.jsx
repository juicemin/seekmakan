import { useEffect, useRef, useState } from "react";
import { searchLocations } from "../api/locations";

export default function SubmissionAddressLookup({ address, onSelect }) {
  const [items, setItems] = useState([]);
  const [status, setStatus] = useState("idle");
  const [error, setError] = useState("");
  const request = useRef(null);

  useEffect(() => {
    request.current?.abort();
    setItems([]);
    setStatus("idle");
    setError("");

    return () => request.current?.abort();
  }, [address]);

  async function findAddress() {
    request.current?.abort();
    const controller = new AbortController();
    request.current = controller;
    setItems([]);
    setError("");
    setStatus("loading");

    try {
      const result = await searchLocations(address, {
        signal: controller.signal,
      });

      if (controller.signal.aborted) return;
      setItems(result.items);
      setStatus("success");
    } catch (failure) {
      if (controller.signal.aborted) return;
      setError(failure.message);
      setStatus("error");
    }
  }

  function closeResults() {
    request.current?.abort();
    setItems([]);
    setStatus("idle");
    setError("");
  }

  return (
    <div className="submission-address-lookup">
      <button
        type="button"
        disabled={address.trim().length < 3 || status === "loading"}
        onClick={findAddress}
      >
        {status === "loading" ? "Finding address…" : "Find address"}
      </button>

      {error && <p role="alert">{error}</p>}

      {status === "success" && items.length === 0 && (
        <p>No address matches. Enter the missing details manually.</p>
      )}

      {items.length > 0 && (
        <>
          <p>Select the address that matches this restaurant.</p>
          <button type="button" onClick={closeResults}>
            Close results
          </button>

          <ul className="contribution-lookup__results">
            {items.map((item, index) => (
              <li key={`${item.latitude}-${item.longitude}-${index}`}>
                <button
                  type="button"
                  onClick={() => {
                    closeResults();
                    onSelect(item);
                  }}
                >
                  {item.label}
                </button>
              </li>
            ))}
          </ul>
        </>
      )}

      <small>
        Address suggestions by{" "}
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
    </div>
  );
}