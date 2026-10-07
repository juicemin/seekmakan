import { useEffect, useRef, useState } from "react";
import { getFavourites } from "../api/favourites";

export default function FavouritesExport({ onSessionExpired }) {
  const [text, setText] = useState("");
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const active = useRef(true);
  const inFlight = useRef(false);

  useEffect(() => {
    active.current = true;

    return () => {
      active.current = false;
    };
  }, []);

  async function prepareExport() {
    if (inFlight.current) return;

    inFlight.current = true;
    setBusy(true);
    setMessage("");
    setText("");

    try {
      const firstPage = await getFavourites(1);
      const items = [...firstPage.items];

      for (let page = 2; page <= firstPage.total_pages; page += 1) {
        if (!active.current) return;

        const result = await getFavourites(page);
        items.push(...result.items);
      }

      if (!active.current) return;

      // Avoid duplicate entries if page contents changed while loading.
      const uniqueItems = [
        ...new Map(
          items.map(item => [item.restaurant_id, item])
        ).values(),
      ];

      if (uniqueItems.length === 0) {
        setMessage("You have no favourites to export.");
        return;
      }

      const entries = uniqueItems.map((item, index) => {
        const restaurant = item.restaurant;

        if (!restaurant) {
          return `${index + 1}. Restaurant unavailable`;
        }

        const address =
          restaurant.address?.full_address ||
          "Address unavailable";

        const foods = restaurant.food_categories?.length
          ? restaurant.food_categories.join(", ")
          : "Not provided";

        return [
          `${index + 1}. ${restaurant.name}`,
          `Address: ${address}`,
          `Foods: ${foods}`,
        ].join("\n");
      });

      setText([
        "My SeekMakan restaurant favourites",
        "",
        ...entries.flatMap(entry => [entry, ""]),
      ].join("\n"));

      setMessage("List ready. Copy it or download a text file.");
    } catch (error) {
      if (!active.current) return;

      if (error.status === 401) {
        onSessionExpired();
      } else {
        setMessage(error.message || "Could not prepare your favourites.");
      }
    } finally {
      inFlight.current = false;

      if (active.current) setBusy(false);
    }
  }

  async function copyList() {
    try {
      if (!navigator.clipboard?.writeText) {
        throw new Error("Clipboard unavailable");
      }

      await navigator.clipboard.writeText(text);

      if (active.current) {
        setMessage("Favourites copied. Paste them into your message.");
      }
    } catch {
      if (active.current) {
        setMessage(
          "Automatic copying is unavailable. Select and copy the text below."
        );
      }
    }
  }

  function downloadList() {
    const blob = new Blob(["\uFEFF", text], {
      type: "text/plain;charset=utf-8",
    });

    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");

    link.href = url;
    link.download = "seekmakan-favourites.txt";
    document.body.appendChild(link);
    link.click();
    link.remove();

    window.setTimeout(() => URL.revokeObjectURL(url), 1000);
    setMessage("Text file download requested.");
  }

  return (
    <section aria-label="Export favourites">
      <div className="restaurant-actions__buttons">
        <button
          type="button"
          disabled={busy}
          onClick={prepareExport}
        >
          {busy ? "Preparing…" : text ? "Refresh export" : "Export favourites"}
        </button>

        {text && (
          <>
            <button type="button" onClick={copyList}>
              Copy list
            </button>

            <button type="button" onClick={downloadList}>
              Download .txt
            </button>

            <button
              type="button"
              onClick={() => {
                setText("");
                setMessage("");
              }}
            >
              Close export
            </button>
          </>
        )}
      </div>

      <p role="status">{message}</p>

      {text && (
        <label className="restaurant-actions__copy">
          Export preview
          <textarea
            readOnly
            rows={8}
            value={text}
            onFocus={event => event.currentTarget.select()}
          />
        </label>
      )}
    </section>
  );
}