import { useState } from "react";
import { DecisionContext } from "./decision-context";

export function DecisionProvider({ children }) {
  const [location, setLocation] = useState(null);

  const [settings, setSettings] = useState({
    source: "nearby",
    radius: "5",
    price: "",
    rating: "",
    openNow: false,
    search: "",
    cuisines: [],
    foodCategories: [],
  });

  const [pool, setPool] = useState(null);
  const [options, setOptions] = useState([]);
  const [winner, setWinner] = useState(null);
  const [rotation, setRotation] = useState(0);

  const [manualRestaurants, setManualRestaurants] = useState([]);
  const [manualExcludedIds, setManualExcludedIds] = useState([]);

  function addManualRestaurant(restaurant) {
    if (manualRestaurants.some(item => item.id === restaurant.id)) {
    return;
  }

  setManualRestaurants(current =>
    current.some(item => item.id === restaurant.id)
      ? current
      : [...current, restaurant],
  );

  // A changed manual collection needs a freshly loaded wheel.
  // Doesn't disturb a nearby or Hidden Gems wheel.
  if (settings.source === "manual") {
    setPool(null);
    setOptions([]);
    setWinner(null);
    setRotation(0);
  }
}

function removeManualRestaurant(restaurantId) {
  setManualRestaurants(current =>
    current.filter(item => item.id !== restaurantId),
  );

  setManualExcludedIds(current =>
  current.filter(id => id !== restaurantId),
);

  if (settings.source === "manual") {
    setPool(current =>
      current === null
        ? null
        : current.filter(item => item.id !== restaurantId),
    );

    setOptions(current =>
      current.filter(item => item.id !== restaurantId),
    );

    setWinner(null);
    setRotation(0);
  }
}

function setManualRestaurantChecked(restaurantId, checked) {
  const nextExcludedIds = checked
    ? manualExcludedIds.filter(id => id !== restaurantId)
    : [...new Set([...manualExcludedIds, restaurantId])];

  setManualExcludedIds(nextExcludedIds);

  if (settings.source === "manual") {
    if (pool !== null) {
      setOptions(
        pool.filter(item => !nextExcludedIds.includes(item.id)),
      );
    }

    setWinner(null);
    setRotation(0);
  }
}

function clearManualRestaurants() {
  setManualRestaurants([]);
  setManualExcludedIds([]);

  if (settings.source === "manual") {
    setPool([]);
    setOptions([]);
    setWinner(null);
    setRotation(0);
  }
}

function loadManualWheel({ preserveExisting = false } = {}) {
  const sameCollection =
    pool !== null &&
    pool.length === manualRestaurants.length &&
    pool.every(
      (restaurant, index) =>
        restaurant.id === manualRestaurants[index].id,
    );

  if (
    preserveExisting &&
    settings.source === "manual" &&
    sameCollection
  ) {
    return;
  }

  setSettings(current => ({ ...current, source: "manual" }));
  setPool([...manualRestaurants]);
  setOptions(
    manualRestaurants.filter(
      item => !manualExcludedIds.includes(item.id),
    ),
  );
  setWinner(null);
  setRotation(0);
}

function prepareDiscoveryWheel(filters) {
  setLocation(filters.location);

  setSettings({
    source: filters.hiddenGems ? "hidden_gems" : "nearby",
    radius: filters.radius || "",
    price: filters.price,
    rating: filters.rating,
    openNow: filters.openNow,
    search: filters.search,
    cuisines: [...filters.cuisines],
    foodCategories: [...filters.foodCategories],
  });

  setPool(null);
  setOptions([]);
  setWinner(null);
  setRotation(0);
}

  return (
    <DecisionContext.Provider
      value={{
        location,
        setLocation,
        settings,
        setSettings,
        pool,
        setPool,
        options,
        setOptions,
        winner,
        setWinner,
        rotation,
        setRotation,
        manualRestaurants,
        addManualRestaurant,
        loadManualWheel,
        removeManualRestaurant,
        clearManualRestaurants,
        manualExcludedIds,
        setManualExcludedIds,
        setManualRestaurantChecked,
        prepareDiscoveryWheel,
      }}
    >
      {children}
    </DecisionContext.Provider>
  );
}