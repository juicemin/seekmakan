import { useEffect, useRef, useState } from "react";
import { Link } from "react-router";
import { checkExistingRestaurants } from "../api/submissions";
import RestaurantSubmissionForm from "./RestaurantSubmissionForm";

export default function RestaurantContribution(props) {
  const [query, setQuery] = useState("");
  const [checkedName, setCheckedName] = useState(null);
  const [items, setItems] = useState([]);
  const [status, setStatus] = useState("idle");
  const [error, setError] = useState("");
  const [adding, setAdding] = useState(false);
  const request = useRef(null);
  useEffect(() => () => request.current?.abort(), []);

  async function check(event) {
    event.preventDefault();
    const name = query.trim();
    if (name.length < 2) return;
    request.current?.abort();
    const controller = new AbortController();
    request.current = controller;
    setStatus("loading"); setError(""); setCheckedName(null);
    try {
      const result = await checkExistingRestaurants(name, controller.signal);
      if (controller.signal.aborted) return;
      setItems(result.items); setCheckedName(name); setStatus("success");
    } catch (failure) {
      if (controller.signal.aborted) return;
      setStatus("error"); setError(failure.message);
      if (failure.status === 401) props.onSessionExpired();
    }
  }

  if (adding) return <RestaurantSubmissionForm {...props} initialName={checkedName} />;

  return (
    <section>
      <h3>Is the restaurant already on SeekMakan?</h3>
      <form onSubmit={check}>
        <label htmlFor="check-restaurant-name">Restaurant name</label>
        <input id="check-restaurant-name" value={query} minLength={2}
          maxLength={100} required onChange={event => {
            request.current?.abort(); setQuery(event.target.value);
            setCheckedName(null); setItems([]); setStatus("idle"); setError("");
          }} />
        <button disabled={status === "loading"} type="submit">
          {status === "loading" ? "Checking…" : "Check SeekMakan"}
        </button>
      </form>
      {error && <p role="alert">{error}</p>}
      {status === "success" && <>
        <p role="status">{items.length ? "Check the addresses for the correct branch." : "No matching names found on SeekMakan."}</p>
        <ul>{items.map(item => <li key={item.id}>
          <strong>{item.name}</strong><p>{item.full_address}</p>
          <Link to={`/restaurants/${item.id}`} state={{ returnTo: "/community" }}>View restaurant</Link>
        </li>)}</ul>
        <button type="button" onClick={() => setAdding(true)}>
          {items.length ? "Not the restaurant I mean — add a new restaurant" : "Add a new restaurant"}
        </button>
      </>}
    </section>
  );
}
