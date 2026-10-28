import { useEffect, useRef, useState } from "react";
import LocationSearch from "./LocationSearch";
import L from "leaflet";

export default function LocationPicker({
  initialLocation,
  onConfirm,
  showSearch = true,
}) {
  const containerRef = useRef(null);
  const mapRef = useRef(null);
  const initialLocationRef = useRef(initialLocation);
  const namedLocationRef = useRef(initialLocation);
  const [tileError, setTileError] = useState(false);

  useEffect(() => {
    const location = initialLocationRef.current;
    const center = location
      ? [location.latitude, location.longitude]
      : [2.8141, 101.7972];

    const map = L.map(containerRef.current, {
      scrollWheelZoom: true,
    }).setView(center, 13);

    mapRef.current = map;

    const tiles = L.tileLayer(
      "https://tile.openstreetmap.org/{z}/{x}/{y}.png",
      {
        maxZoom: 19,
        attribution:
          '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
      }
    );

    const handleTileError = () => setTileError(true);
    tiles.on("tileerror", handleTileError);
    tiles.addTo(map);

    // Clicking a point moves that point beneath the centre crosshair.
    const handleMapClick = event => {
      map.panTo(event.latlng, { animate: false });
    };

    map.on("click", handleMapClick);

    const observer = new ResizeObserver(() => {
      map.invalidateSize({ pan: false });
    });

    observer.observe(containerRef.current);

    return () => {
      observer.disconnect();
      tiles.off("tileerror", handleTileError);
      map.off("click", handleMapClick);
      map.remove();
      mapRef.current = null;
    };
  }, []);

  function handleSearchLocation(location) {
  const map = mapRef.current;
  if (!map) return;

  namedLocationRef.current = location;

  map.setView(
    [location.latitude, location.longitude],
    14,
    { animate: false },
  );
}

  function handleConfirm() {
    const map = mapRef.current;
    if (!map) return;

    const center = map.getCenter().wrap();
    const namedLocation = namedLocationRef.current;

    const stillAtNamedLocation =
      namedLocation &&
      center.distanceTo([
        namedLocation.latitude,
        namedLocation.longitude,
      ]) < 1;

    onConfirm({
      latitude: center.lat,
      longitude: center.lng,
      label: stillAtNamedLocation
        ? namedLocation.label || "Selected map location"
        : "Selected map location",
      });
    }

  return (
    <section aria-label="Choose a search location">
      {showSearch && <LocationSearch onSelect={handleSearchLocation} />}

      <p id="location-picker-help">
        {showSearch
          ? "Search for a location, or move the map to position the crosshair."
          : "Move the map or click to position the crosshair at the restaurant."}
        {" "}Then choose Use this location.
      </p>

      {tileError && (
        <p role="alert">
          Some map tiles could not load. Check your connection before
          selecting a location.
        </p>
      )}

      <div className="location-picker__map-wrap">
        <div
          ref={containerRef}
          className="location-picker__map"
          aria-label="Search location map"
          aria-describedby="location-picker-help"
        />
        <span className="location-picker__crosshair" aria-hidden="true">
          +
        </span>
      </div>

      <button type="button" onClick={handleConfirm}>
        Use this location
      </button>
    </section>
  );
}