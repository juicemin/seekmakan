import { useCallback, useEffect, useRef, useState } from "react";
import { getRestaurants, getRestaurantFilterOptions } from "../api/restaurants";
import RestaurantList from "../components/RestaurantList";
import CheckboxDropdown from "../components/CheckboxDropdown";
import RestaurantMap from "../components/RestaurantMap";
import LocationPicker from "../components/LocationPicker";

function RestaurantDiscoveryPage() {
  const [restaurants, setRestaurants] = useState([]);
  const [status, setStatus] = useState("loading");
  const [error, setError] = useState("");
  const [page, setPage] = useState(1);
  const pageSize = 20;
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(0);
  const [retry, setRetry] = useState(0);
  const [searchInput, setSearchInput] = useState("");
  const [search, setSearch] = useState("");
  const [filterOptions, setFilterOptions] = useState({
    cuisines: [],
    food_categories: [],
  });
  const [optionsStatus, setOptionsStatus] = useState("loading");
  const [optionsError, setOptionsError] = useState("");
  const [optionsRetry, setOptionsRetry] = useState(0);
  const [selectedCuisines, setSelectedCuisines] = useState([]);
  const [selectedCategories, setSelectedCategories] = useState([]);
  const [appliedCuisines, setAppliedCuisines] = useState([]);
  const [appliedCategories, setAppliedCategories] = useState([]);
  const [selectedPrice, setSelectedPrice] = useState("");
  const [selectedRating, setSelectedRating] = useState("");
  const [appliedPrice, setAppliedPrice] = useState("");
  const [appliedRating, setAppliedRating] = useState("");
  const [selectedOpenNow, setSelectedOpenNow] = useState(false);
  const [appliedOpenNow, setAppliedOpenNow] = useState(false);  
  const [mobileView, setMobileView] = useState("list");
  const [selectedRestaurantId, setSelectedRestaurantId] = useState(null);
  const handleMapSelect = useCallback((restaurantId) => {
    setSelectedRestaurantId(restaurantId);
    setMobileView("list");
  }, []);
  const [selectedLocation, setSelectedLocation] = useState(null);
  const [appliedLocation, setAppliedLocation] = useState(null);
  const [selectedRadius, setSelectedRadius] = useState("");
  const [appliedRadius, setAppliedRadius] = useState("");
  const [locationStatus, setLocationStatus] = useState("idle");
  const [locationError, setLocationError] = useState("");
  const [showLocationPicker, setShowLocationPicker] = useState(false);
  const locationRequestRef = useRef(0);
  useEffect(() => {
  return () => {
    locationRequestRef.current += 1;
  };
}, []);

  useEffect(() => {
    const controller = new AbortController();
    let active = true;
    async function loadRestaurants() {
      setStatus("loading");
      setError("");

      try {
        const data = await getRestaurants({
          page,
          pageSize,
          search,
          cuisines: appliedCuisines,
          foodCategories: appliedCategories,
          priceRange: appliedPrice,
          minRating: appliedRating,
          location: appliedLocation,
          radiusKm: appliedRadius,
          openNow: appliedOpenNow,
          signal: controller.signal
        });

        if (!active) return;

        setRestaurants(data.items);
        setSelectedRestaurantId(null);
        setTotal(data.total);
        setTotalPages(data.total_pages);
        setStatus("success");
      } catch (requestError) {
        if (!active || requestError.name === "AbortError") {
          return;
        }

        setError(requestError.message);
        setStatus("error");
      }
    }
    loadRestaurants();

    return () => {
      active = false;
      controller.abort();
    };
  }, [
    page,
    pageSize,
    search,
    appliedCuisines,
    appliedCategories,
    appliedPrice,
    appliedRating,
    appliedLocation,
    appliedRadius,
    appliedOpenNow,
    retry,
  ]);

  useEffect(() => {
    const controller = new AbortController();
    let active = true;

    async function loadOptions() {
      setOptionsStatus("loading");
      setOptionsError("");

      try {
        const data = await getRestaurantFilterOptions({
          signal: controller.signal,
        });

        if (!active) return;

        setFilterOptions(data);
        setOptionsStatus("success");
      } catch (error) {
        if (!active || error.name === "AbortError") return;

        setOptionsError(error.message);
        setOptionsStatus("error");
      }
    }

    loadOptions();

    return () => {
      active = false;
      controller.abort();
    };
  }, [optionsRetry]);

  function handleUseMyLocation() {
    setShowLocationPicker(false);
    const requestId = ++locationRequestRef.current;
    setLocationError("");

    if (!navigator.geolocation) {
      setLocationStatus("error");
      setLocationError("This browser does not support location access.");
      return;
    }

    setLocationStatus("loading");

    navigator.geolocation.getCurrentPosition(
      position => {
        if (requestId !== locationRequestRef.current) return;

        setSelectedLocation({
          latitude: position.coords.latitude,
          longitude: position.coords.longitude,
          accuracy: position.coords.accuracy,
        });
        setLocationStatus("success");
      },
      error => {
        if (requestId !== locationRequestRef.current) return;
        setLocationError("");

        const messages = {
          1: "Location permission was denied. You can still browse without a distance filter.",
          2: "Your location could not be determined. Please try again.",
          3: "Location lookup timed out. Please try again.",
        };

        setLocationStatus("error");
        setLocationError(
          messages[error.code] || "Unable to access your location."
        );
      },
      {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 60000,
      }
    );
  }

  function handleConfirmMapLocation(location) {
  // Ignore any older browser-location request still finishing.
  locationRequestRef.current += 1;

  setSelectedLocation(location);
  setLocationStatus("success");
  setLocationError("");
  setShowLocationPicker(false);
}

  function handleSearch(event) {
    event.preventDefault();

    if (locationStatus === "loading") {
      setLocationError("Wait for location lookup, or use Clear to cancel.");
      return;
    }

    if (selectedRadius !== "" && selectedLocation === null) {
      setLocationError("Choose a location before applying a distance.");
      return;
    }

    setLocationError("");
    setAppliedLocation(
      selectedRadius === "" ? null : selectedLocation
    );
    setAppliedRadius(selectedRadius);

    setSearch(searchInput.trim());
    setAppliedCuisines([...selectedCuisines]);
    setAppliedCategories([...selectedCategories]);
    setAppliedPrice(selectedPrice);
    setAppliedRating(selectedRating);
    setAppliedOpenNow(selectedOpenNow);
    setPage(1);
    setRetry(value => value + 1);
  }

  function handleClearSearch() {
    setSearchInput("");
    setSearch("");
    setSelectedCuisines([]);
    setSelectedCategories([]);
    setAppliedCuisines([]);
    setAppliedCategories([]);
    setSelectedPrice("");
    setSelectedRating("");
    setAppliedPrice("");
    setAppliedRating("");
    setSelectedOpenNow(false);
    setAppliedOpenNow(false);

    locationRequestRef.current += 1;
    setSelectedLocation(null);
    setAppliedLocation(null);
    setSelectedRadius("");
    setAppliedRadius("");
    setLocationStatus("idle");
    setLocationError("");
    setShowLocationPicker(false);

    setPage(1);
    setRetry(value => value + 1);
  }

  // Calculate total pages and visible page buttons
  const maxVisible = 5; // Maximum number of visible page buttons

  let startPage = Math.max(1, page - Math.floor(maxVisible / 2));
  let endPage = startPage + maxVisible - 1;

  if (endPage > totalPages) {
    endPage = totalPages;
    startPage = Math.max(1, endPage - maxVisible + 1);
  }

  const visiblePages = Array.from({ length: endPage - startPage + 1 }, (_, i) => startPage + i);

  const hasUnappliedChanges =
    searchInput.trim() !== search ||
    selectedCuisines.length !== appliedCuisines.length ||
    selectedCuisines.some(value => !appliedCuisines.includes(value)) ||
    selectedCategories.length !== appliedCategories.length ||
    selectedCategories.some(value => !appliedCategories.includes(value)) ||
    selectedPrice !== appliedPrice ||
    selectedRating !== appliedRating ||
    selectedOpenNow !== appliedOpenNow ||
    selectedRadius !== appliedRadius ||
    (
      selectedRadius !== "" &&
      (
        selectedLocation?.latitude !== appliedLocation?.latitude ||
        selectedLocation?.longitude !== appliedLocation?.longitude
      )
    );

  useEffect(() => {
    if (!selectedRestaurantId || status !== "success") return;

    const card = document.getElementById(
      `restaurant-${selectedRestaurantId}`
   );

    if (!card) return;

    card.focus({ preventScroll: true });
    card.scrollIntoView({
      behavior: "auto",
      block: "nearest",
    });
  }, [selectedRestaurantId, mobileView, status]);

  return (
    <main className="page">
      <header className="page-header">
        <p className="eyebrow">SeekMakan</p>
        <h1>Restaurant Discovery</h1>
        <p>
          Explore restaurants and discover food around Malaysia.
        </p>
      </header>

      <form
        className="restaurant-search"
        role="search"
        onSubmit={handleSearch}
      >
        <label htmlFor="restaurant-search">
          Search restaurants
        </label>

        <div className="restaurant-search__controls">
          <input
            id="restaurant-search"
            type="search"
            value={searchInput}
            onChange={event => setSearchInput(event.target.value)}
            placeholder="Restaurant name, cuisine, or food category"
            maxLength={100}
          />

          <button type="submit">
            Search
          </button>

          <button type="button" onClick={handleClearSearch}>
            Clear
          </button>
        </div>
        {optionsStatus === "loading" && (
          <p role="status">Loading filter options...</p>
        )}

        {optionsStatus === "error" && (
          <div role="alert">
            <p>Filter options could not be loaded: {optionsError}</p>
            <button
              type="button"
              onClick={() => setOptionsRetry(value => value + 1)}
            >
              Retry filter options
            </button>
          </div>
        )}

        <div className="location-controls">
          <button
            type="button"
            onClick={handleUseMyLocation}
            disabled={locationStatus === "loading"}
          >
            {locationStatus === "loading"
              ? "Finding location..."
              : "Use my location"}
          </button>

          <button
            type="button"
            aria-expanded={showLocationPicker}
            aria-controls="location-picker-panel"
            onClick={() => {
              locationRequestRef.current += 1;
              setLocationStatus("idle");
              setLocationError("");
              setShowLocationPicker(value => !value);
            }}
          >
            {showLocationPicker ? "Close location picker" : "Choose on map"}
          </button>

          <label htmlFor="distance-filter">
            Distance
          <select
            id="distance-filter"
            value={selectedRadius}
            onChange={event => setSelectedRadius(event.target.value)}
          >
            <option value="">Any distance</option>
            <option value="1">Within 1 km</option>
            <option value="3">Within 3 km</option>
            <option value="5">Within 5 km</option>
            <option value="10">Within 10 km</option>
            <option value="25">Within 25 km</option>
            <option value="50">Within 50 km</option>
          </select>
        </label>
      </div>

      <div id="location-picker-panel" hidden={!showLocationPicker}>
        {showLocationPicker && (
          <LocationPicker
            initialLocation={selectedLocation}
            onConfirm={handleConfirmMapLocation}
          />
        )}
      </div>

      {locationError && <p role="alert">{locationError}</p>}

      {selectedLocation && (
        <p role="status">
          Location selected
          {selectedLocation.accuracy != null &&
            ` — estimated accuracy ${Math.round(selectedLocation.accuracy)} m`}.
        </p>
      )}

        {optionsStatus === "success" && (
          <div className="discovery-filters">
            <CheckboxDropdown
              label="Cuisine"
              options={filterOptions.cuisines}
              selected={selectedCuisines}
              onChange={setSelectedCuisines}
            />

            <CheckboxDropdown
              label="Food category"
              options={filterOptions.food_categories}
              selected={selectedCategories}
              onChange={setSelectedCategories}
            />
          </div>
        )}

        <details className="more-filters">
          <summary>More filters</summary>

          <div className="more-filters__controls">
            <label htmlFor="price-filter">
            Price range
            <select
              id="price-filter"
              value={selectedPrice}
              onChange={event => setSelectedPrice(event.target.value)}
            >
              <option value="">Any price</option>
              <option value="RM1-RM20">RM1–RM20</option>
              <option value="RM21-RM50">RM21–RM50</option>
              <option value="RM51+">RM51+</option>
            </select>
          </label>

          <label htmlFor="rating-filter">
          Rating
          <select
            id="rating-filter"
            value={selectedRating}
            onChange={event => setSelectedRating(event.target.value)}
          >
            <option value="">Any rating</option>
            <option value="3">3 stars and above</option>
            <option value="4">4 stars and above</option>
            <option value="4.5">4.5 stars and above</option>
          </select>
          </label>
        </div>

        <label className="open-now-filter">
          <input
            type="checkbox"
            checked={selectedOpenNow}
            onChange={event => setSelectedOpenNow(event.target.checked)}
          />
          Open now
        </label>
      </details>

        {hasUnappliedChanges && (
          <p role="status">
            Changes not applied. Click Search to update the results.
          </p>
        )}

      </form>

      {appliedCuisines.length > 0 && (
        <p>Applied cuisines: {appliedCuisines.join(", ")}</p>
      )}

      {appliedCategories.length > 0 && (
        <p>Applied food categories: {appliedCategories.join(", ")}</p>
      )}

      {appliedPrice && <p>Applied price: {appliedPrice}</p>}

      {appliedRating && (
        <p>Applied minimum rating: {appliedRating} stars</p>
      )}

      {appliedOpenNow && (
        <p>Open now, based on listed hours in Malaysia time.</p>
      )}

      {appliedLocation && appliedRadius !== "" && (
        <p>
          Within {appliedRadius} km of the selected location
          {" "}(approximate straight-line distance).
        </p>
      )}

      {search && <p>Results for “{search}”</p>}

      {status === "loading" && (
        <section
          className="status-message"
          aria-live="polite"
        >
          <p>Loading restaurants...</p>
        </section>
      )}

      {status === "error" && (
        <section
          className="status-message status-message--error"
          role="alert"
        >
          <h2>Restaurants could not be loaded</h2>
          <p>{error}</p>

          <button
            type="button"
            onClick={() => setRetry(value => value + 1)}
          >
            Try again
          </button>
        </section>
      )}

      {status === "success" && (
        <section>
          <p aria-live="polite">
            {restaurants.length > 0
              ? `Showing ${(page - 1) * pageSize + 1}–${(page - 1) * pageSize + restaurants.length} of ${total} restaurants`
              : `0 restaurants displayed (${total} available)`}
          </p>

          {restaurants.length > 0 && (
            <div className="view-switch" role="group" aria-label="Results view">
              <button
                type="button"
                aria-pressed={mobileView === "list"}
                onClick={() => setMobileView("list")}
              >
              List
              </button>

              <button
                type="button"
                aria-pressed={mobileView === "map"}
                onClick={() => setMobileView("map")}
              >
              Map
              </button>
            </div>
          )}

            <div
              className={`discovery-results ${
                restaurants.length === 0 ? "discovery-results--empty" : ""
              }`}
              data-mobile-view={mobileView}
            >
            {restaurants.length > 0 && (
              <div className="discovery-map-panel">
              <RestaurantMap 
              restaurants={restaurants} 
              onSelectRestaurant={handleMapSelect}
              />
              </div>
            )}

            <div className="discovery-list-panel">
              {restaurants.length === 0 && total > 0 ? (
                <p>No restaurants on this page. Return to the first page.</p>
              ) : (
                <RestaurantList 
                restaurants={restaurants} 
                selectedRestaurantId={selectedRestaurantId}
                />
              )}
            </div>
          </div>

          <nav className="pagination" aria-label="Restaurant pages">
            <button
              type="button"
              disabled={page <= 1}
              onClick={() => setPage(current => current - 1)}
            >
              Previous
            </button>

            {visiblePages.map(pageNumber => (
              <button
                key={pageNumber}
                type="button"
                onClick={() => setPage(pageNumber)}
                aria-label={`Go to page ${pageNumber}`}
                aria-current={pageNumber === page ? "page" : undefined}
              >
                {pageNumber}
              </button>
            ))}

            <button
              type="button"
              disabled={page >= totalPages}
              onClick={() => setPage(current => current + 1)}
            >
              Next
            </button>
          </nav>
        </section>
      )}
    </main>
  );
}

export default RestaurantDiscoveryPage;
