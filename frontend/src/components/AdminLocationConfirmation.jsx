import { useRef, useState } from "react";
import { API_BASE_URL } from "../config";
import SubmissionAddressLookup from "./SubmissionAddressLookup";

export default function AdminLocationConfirmation({
  submission,
  onSaved,
}) {
  const [address, setAddress] = useState(
    submission.restaurant.address.full_address
  );
  const [latitude, setLatitude] = useState("");
  const [longitude, setLongitude] = useState("");
  const [note, setNote] = useState("");
  const [confirmed, setConfirmed] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [needsRefresh, setNeedsRefresh] = useState(false);
  const sending = useRef(false);

  async function save(event) {
    event.preventDefault();
    if (sending.current || needsRefresh) return;

    setError("");

    const lat = Number(latitude);
    const lon = Number(longitude);

    if (
      !latitude.trim() ||
      !longitude.trim() ||
      !Number.isFinite(lat) ||
      !Number.isFinite(lon) ||
      lat < -90 || lat > 90 ||
      lon < -180 || lon > 180
    ) {
      setError("Enter valid latitude and longitude.");
      return;
    }

    if (!confirmed || note.trim().length < 5) {
      setError("Explain how you checked the location and tick confirmation.");
      return;
    }

    sending.current = true;
    setBusy(true);

    try {
      const response = await fetch(
        `${API_BASE_URL}/api/admin/submissions/${submission.id}/location`,
        {
          method: "POST",
          credentials: "include",
          headers: {
            "Content-Type": "application/json",
            "X-Requested-With": "SeekMakan",
          },
          body: JSON.stringify({
            location: {
              type: "Point",
              coordinates: [lon, lat],
            },
            note: note.trim(),
          }),
        }
      );

      const result = await response.json().catch(() => ({}));

      if (!response.ok) {
        if (response.status >= 500 || response.status === 409) {
          setNeedsRefresh(true);
        }
        setError(
          typeof result.detail === "string"
            ? result.detail
            : "Location could not be saved. Check the values."
        );
        return;
      }

      onSaved(result.message);
    } catch {
      setNeedsRefresh(true);
      setError("Save could not be confirmed. Refresh before retrying.");
    } finally {
      sending.current = false;
      setBusy(false);
    }
  }

  return (
    <details className="admin-location">
      <summary>Confirm missing location</summary>

      <form onSubmit={save}>
        <fieldset disabled={busy || needsRefresh}>
          <label>
            Search address
            <input
              value={address}
              maxLength={300}
              onChange={event => {
                setAddress(event.target.value);
                setConfirmed(false);
              }}
            />
          </label>

          <SubmissionAddressLookup
            address={address}
            onSelect={item => {
              setLatitude(String(item.latitude));
              setLongitude(String(item.longitude));
              setConfirmed(false);
              setError("");
            }}
          />

          <p>
            Check that the result identifies the restaurant, not just its
            town or street. If no match exists, enter independently checked
            coordinates. Do not guess.
          </p>

          <label>
            Latitude
            <input
              type="number"
              step="any"
              min="-90"
              max="90"
              required
              value={latitude}
              onChange={event => {
                setLatitude(event.target.value);
                setConfirmed(false);
              }}
            />
          </label>

          <label>
            Longitude
            <input
              type="number"
              step="any"
              min="-180"
              max="180"
              required
              value={longitude}
              onChange={event => {
                setLongitude(event.target.value);
                setConfirmed(false);
              }}
            />
          </label>

          <label>
            How was the location checked?
            <textarea
              value={note}
              minLength={5}
              maxLength={500}
              required
              onChange={event => {
                setNote(event.target.value);
                setConfirmed(false);
              }}
            />
          </label>

          <label>
            <input
              type="checkbox"
              checked={confirmed}
              required
              onChange={event => setConfirmed(event.target.checked)}
            />
            I checked that these coordinates match the restaurant.
          </label>

          <button type="submit">
            {busy ? "Saving…" : "Save confirmed location"}
          </button>
        </fieldset>

        {error && <p role="alert">{error}</p>}
      </form>
    </details>
  );
}