import { useEffect, useRef, useState } from "react";
import L from "leaflet";

const DEFAULT_CENTER = [2.8141, 101.7972];

export default function RestaurantMap({
  restaurants,
  onSelectRestaurant,
}) {
    const containerRef = useRef(null);
    const mapRef = useRef(null);
    const markersRef = useRef(null);
    const [tileError, setTileError] = useState(false);

  // Create the map when this component mounts.
  useEffect(() => {
    const map = L.map(containerRef.current, {
      scrollWheelZoom: false,
    }).setView(DEFAULT_CENTER, 12);

    mapRef.current = map;
    markersRef.current = L.featureGroup().addTo(map);

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

    const observer = new ResizeObserver(() => {
        const container = map.getContainer();

        if (container.clientWidth === 0 || container.clientHeight === 0) {
            return;
            }

        map.invalidateSize({ pan: false });
            
    const bounds = markersRef.current?.getBounds();

        if (bounds?.isValid()) {
            map.fitBounds(bounds, {
            padding: [30, 30],
            maxZoom: 15,
            animate: false,
            });
        }
    });

    observer.observe(containerRef.current);

    return () => {
      observer.disconnect();
      tiles.off("tileerror", handleTileError);
      map.remove();
      mapRef.current = null;
      markersRef.current = null;
    };
  }, []);

  // Replace markers when the displayed restaurant results change.
  useEffect(() => {
    const map = mapRef.current;
    const markers = markersRef.current;

    if (!map || !markers) return;

    markers.clearLayers();
    const positions = [];

    restaurants.forEach(restaurant => {
      const coordinates = restaurant.location?.coordinates;

      if (!Array.isArray(coordinates) || coordinates.length !== 2) {
        return;
      }

      const [longitude, latitude] = coordinates;

      if (
        !Number.isFinite(longitude) ||
        !Number.isFinite(latitude) ||
        longitude < -180 ||
        longitude > 180 ||
        latitude < -90 ||
        latitude > 90
      ) {
        return;
      }

      const position = [latitude, longitude];
      positions.push(position);

      const popup = document.createElement("span");
      popup.textContent = restaurant.name;

      L.circleMarker(position, {
        radius: 9,
        color: "#9a3412",
        fillColor: "#ea580c",
        fillOpacity: 0.85,
        weight: 2,
      })
        .bindPopup(popup)
        .on("click", () => {
            onSelectRestaurant(restaurant.id);
        })
        .addTo(markers);
    });

    if (
        positions.length > 0 &&
        map.getContainer().clientWidth > 0 &&
        map.getContainer().clientHeight > 0
    ) {
        map.fitBounds(positions, {
        padding: [30, 30],
        maxZoom: 15,
      });
    } else {
      map.setView(DEFAULT_CENTER, 12);
    }
  }, [restaurants, onSelectRestaurant]);

  return (
    <section aria-label="Map of current restaurant results">
      <p>Map of restaurants on this page</p>

      {tileError && (
        <p role="status">
          Some map tiles could not load. You can still browse the
          restaurant list. Check your connection and refresh to retry.
        </p>
      )}

      <div
        ref={containerRef}
        className="restaurant-map"
        aria-label="Interactive restaurant map"
      />
    </section>
  );
}
