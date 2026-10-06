import { useRef, useState } from "react";

export default function RestaurantActions({
  restaurant,
  variant = "location",
}) {
  const [message, setMessage] = useState("");
  const [manualCopy, setManualCopy] = useState(null);
  const [busy, setBusy] = useState(false);
  const busyRef = useRef(false);

  const address = restaurant.address.full_address;
  const [longitude, latitude] = restaurant.location?.coordinates ?? [];

  const validCoordinates =
    Number.isFinite(latitude) &&
    Number.isFinite(longitude) &&
    latitude >= -90 &&
    latitude <= 90 &&
    longitude >= -180 &&
    longitude <= 180;

  const directionParams = new URLSearchParams({
    api: "1",
    destination: validCoordinates
      ? `${latitude},${longitude}`
      : `${restaurant.name}, ${address}`,
  });

  const directionsUrl =
    `https://www.google.com/maps/dir/?${directionParams}`;

  // Share the restaurant itself, not discovery filters or return state.
  const shareUrl = new URL(
    `/restaurants/${encodeURIComponent(restaurant.id)}`,
    window.location.origin,
  ).href;

  async function copyText(text, label) {
    try {
      if (!navigator.clipboard?.writeText) {
        throw new Error("Clipboard unavailable");
      }

      await navigator.clipboard.writeText(text);
      setManualCopy(null);
      setMessage(`${label} copied.`);
    } catch {
      setManualCopy({ label, text });
      setMessage(
        `Automatic copying is unavailable. Select and copy the ${label.toLowerCase()} below.`,
      );
    }
  }

  async function handleAction(action) {
    if (busyRef.current) return;

    busyRef.current = true;
    setBusy(true);
    setMessage("");
    setManualCopy(null);

    try {
      if (action === "address") {
        await copyText(address, "Address");
        return;
      }

      const shareData = {
        title: restaurant.name,
        text: `View ${restaurant.name} on SeekMakan`,
        url: shareUrl,
      };

      const canShare =
        typeof navigator.share === "function" &&
        (
          typeof navigator.canShare !== "function" ||
          navigator.canShare(shareData)
        );

      if (canShare) {
        try {
          await navigator.share(shareData);
          setMessage("Share request completed.");
          return;
        } catch (error) {
          if (error.name === "AbortError") {
            // Cancelling the share sheet is not an error.
            return;
          }
        }
      }

      await copyText(shareUrl, "Link");
    } finally {
      busyRef.current = false;
      setBusy(false);
    }
  }

  return (
    <div className="restaurant-actions">
      <div
        className="restaurant-actions__buttons"
        role="group"
        aria-label="Restaurant actions"
      >
        {variant === "location" && (
            <>
                <a
                    href={directionsUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                >
                    Directions ↗
                    <span className="restaurant-actions__hint">
                        {" "}(Google Maps)
                    </span>
                </a>

                <button
                    type="button"
                    disabled={busy}
                    onClick={() => handleAction("address")}
                >
                    Copy address
                </button>
            </>
        )}

        {variant === "share" && (
            <button
                type="button"
                disabled={busy}
                onClick={() => handleAction("share")}
            >
                Share
            </button>
        )}
      </div>

      <p role="status" aria-live="polite">
        {message}
      </p>

      {manualCopy && (
        <label className="restaurant-actions__copy">
          {manualCopy.label}
          <textarea
            readOnly
            rows={3}
            value={manualCopy.text}
            onFocus={event => event.currentTarget.select()}
          />
        </label>
      )}
    </div>
  );
}