import { useEffect, useState } from "react";
import { getRestaurantNameSuggestions } from "../api/submissions";

export default function RestaurantCandidatePicker({ value, onChange, onSelect }) {
  const [items, setItems] = useState([]);
  const [status, setStatus] = useState("idle");
  const [error, setError] = useState("");
  const [selectedName, setSelectedName] = useState(null);

  useEffect(() => {
    if (value.trim().length < 2 || value === selectedName) return;
    const controller = new AbortController();
    const timer = setTimeout(async () => {
      setStatus("loading");
      try {
        const result = await getRestaurantNameSuggestions(value.trim(), controller.signal);
        if (controller.signal.aborted) return;
        setItems(result.items); setStatus("success");
      } catch (failure) {
        if (controller.signal.aborted) return;
        setError(failure.message); setStatus("error");
      }
    }, 1100);
    return () => { clearTimeout(timer); controller.abort(); };
  }, [value, selectedName]);

  return <section>
    <label htmlFor="submission-restaurant-name">Restaurant name *</label>
    <input id="submission-restaurant-name" value={value} required minLength={2}
      maxLength={100} autoComplete="off" placeholder="Type the restaurant name"
      onChange={event => {
        setItems([]); setError(""); setStatus("idle"); setSelectedName(null);
        onChange(event.target.value);
      }} onKeyDown={event => { if (event.key === "Enter") event.preventDefault(); }} />
    {status === "loading" && <p role="status">Finding suggestions…</p>}
    {error && <p role="alert">{error} You can still enter the details manually.</p>}
    {status === "success" && items.length === 0 && <p>No suggestions found. Enter the address and choose the location below.</p>}
    {items.length > 0 && <ul className="contribution-lookup__results">
      {items.map(item => <li key={item.provider_id}>
        <button type="button" onClick={() => {
          setSelectedName(item.name); setItems([]); setStatus("idle"); onSelect(item);
        }}><strong>{item.name}</strong><span>{item.full_address}</span></button>
      </li>)}
    </ul>}
    <small>Suggestions by <a href="https://www.geoapify.com/">Geoapify</a> / <a href="https://www.openstreetmap.org/copyright">OpenStreetMap contributors</a>. Check the name and address before submitting.</small>
  </section>;
}
