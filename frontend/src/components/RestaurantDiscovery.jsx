import { useCallback, useEffect, useRef, useState } from "react";
import { getRestaurants, getRestaurantFilterOptions } from "../api/restaurants";
import RestaurantList from "./RestaurantList";
import CheckboxDropdown from "./CheckboxDropdown";
import RestaurantMap from "./RestaurantMap";
import LocationPicker from "./LocationPicker";
import ResponsiveFilters from "./ResponsiveFilters";

function RestaurantDiscovery({ foodCategory = null }) {
  const isFoodDiscovery = foodCategory !== null;
  const Container = isFoodDiscovery ? "section" : "main";

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
  const [selectedHiddenGems, setSelectedHiddenGems] = useState(false);
  const [appliedHiddenGems, setAppliedHiddenGems] = useState(false);
  
  const [mobileView, setMobileView] = useState("list");
  const [selectedRestaurantId, setSelectedRestaurantId] = useState(null);
  const handleMapSelect = useCallback((restaurantId) => {
    setSelectedRestaurantId(restaurantId);
    setMobileView("list");
  }, []);
  const [filtersOpen, setFiltersOpen] = useState(false);
  const closeFilters = useCallback(() => {
    setFiltersOpen(false);
  }, []);
  const closeMap = useCallback(() => {
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

  const [isMobileLayout, setIsMobileLayout] = useState(
    () => window.matchMedia("(max-width: 800px)").matches,
  );

  useEffect(() => {
    const media = window.matchMedia("(max-width: 800px)");

    function handleLayoutChange(event) {
      setIsMobileLayout(event.matches);
    }

    media.addEventListener("change", handleLayoutChange);

    return () => {
      media.removeEventListener("change", handleLayoutChange);
    };
  }, []);

  useEffect(() => {
    const controller = new AbortController();
    let active = true;
    async function loadRestaurants() {
      setStatus("loading");
      setMobileView("list");
      setError("");

      try {
        const data = await getRestaurants({
          page,
          pageSize,
          search,
          cuisines: appliedCuisines,
          foodCategories:
          foodCategory === null ? appliedCategories : [foodCategory],
          priceRange: appliedPrice,
          minRating: appliedRating,
          location: appliedLocation,
          radiusKm: appliedRadius,
          openNow: appliedOpenNow,
          hiddenGems: appliedHiddenGems,
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
    foodCategory,
    appliedPrice,
    appliedRating,
    appliedLocation,
    appliedRadius,
    appliedOpenNow,
    appliedHiddenGems,
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
          label: "Your current location",
        });
        setLocationError("");
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
    setAppliedHiddenGems(selectedHiddenGems);
    setPage(1);
    setRetry(value => value + 1);
    setFiltersOpen(false);
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
    setSelectedHiddenGems(false);
    setAppliedHiddenGems(false);

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
    selectedHiddenGems !== appliedHiddenGems ||
    selectedRadius !== appliedRadius ||
    (
      selectedRadius !== "" &&
      (
        selectedLocation?.latitude !== appliedLocation?.latitude ||
        selectedLocation?.longitude !== appliedLocation?.longitude
      )
    );

    useEffect(() => {
      if (
        isMobileLayout ||
        !hasUnappliedChanges ||
        showLocationPicker ||
        locationStatus === "loading"
      ) {
        return;
      }

      if (selectedRadius !== "" && selectedLocation === null) {
        setLocationError("Choose a location before applying a distance.");
      return;
      }

      const timeoutId = window.setTimeout(() => {
        setLocationError("");
        setSearch(searchInput.trim());
        setAppliedCuisines(selectedCuisines);
        setAppliedCategories(selectedCategories);
        setAppliedPrice(selectedPrice);
        setAppliedRating(selectedRating);
        setAppliedOpenNow(selectedOpenNow);
        setAppliedHiddenGems(selectedHiddenGems);

        setAppliedLocation(
          selectedRadius === "" ? null : selectedLocation,
        );
        setAppliedRadius(selectedRadius);

        setPage(1);
      }, 400);

      return () => window.clearTimeout(timeoutId);
    }, [
      isMobileLayout,
      hasUnappliedChanges,
      searchInput,
      selectedCuisines,
      selectedCategories,
      selectedPrice,
      selectedRating,
      selectedOpenNow,
      selectedHiddenGems,
      selectedLocation,
      selectedRadius,
      showLocationPicker,
      locationStatus,
    ]);

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

  // Summary of applied filters 
  const appliedFilterLabels = [
    ...(search ? [`Search: ${search}`] : []),

    ...(foodCategory
      ? [`Food: ${foodCategory}`]
      : appliedCategories.map(value => `Food: ${value}`)),

    ...appliedCuisines.map(value => `Cuisine: ${value}`),

    ...(appliedPrice ? [`Price: ${appliedPrice}`] : []),

    ...(appliedRating ? [`Rating: ${appliedRating}+`] : []),

    ...(appliedOpenNow ? ["Open now"] : []),

    ...(appliedHiddenGems ? ["Hidden Gems"] : []),

    ...(appliedLocation && appliedRadius !== ""
      ? [
          `Within ${appliedRadius} km of ${
            appliedLocation.label || "selected map location"
          }`,
        ]
      : []),
  ];

  return (
    <Container
      className={
        isFoodDiscovery ? "food-results" : "page discovery-page"
      }
    >
      <header className="page-header">
        {isFoodDiscovery ? (
          <h2>Restaurants serving {foodCategory}</h2>
        ) : (
          <>
            <p className="eyebrow">SeekMakan</p>
            <h1>Restaurant Discovery</h1>
            <p>Explore restaurants and discover food around Malaysia.</p>
          </>
        )}
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
            placeholder={
              isFoodDiscovery
                ? "Search restaurants"
                : "Name, cuisine, or food category"
            }
            maxLength={100}
          />

          <button type="submit">
            Search
          </button>

          <button type="button" onClick={handleClearSearch}>
            Clear
          </button>
        </div>

        <button
          type="button"
          className="mobile-filter-trigger"
          aria-haspopup="dialog"
          aria-expanded={filtersOpen}
          onClick={() => {
            setMobileView("list");
            setFiltersOpen(true);
          }}
        >
          Filters
        </button>

        <ResponsiveFilters
          open={filtersOpen}
          onClose={closeFilters}
        >
    
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
            {showLocationPicker ? "Close location picker" : "Search or choose on map"}
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
            Selected location:{" "}
            {selectedLocation.label || "Selected map location"}
            {selectedLocation.accuracy != null &&
              ` — estimated accuracy ${Math.round(selectedLocation.accuracy)} m`}
            {selectedRadius !== "" && ` · Within ${selectedRadius} km`}
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

            {!isFoodDiscovery && (
              <CheckboxDropdown
                label="Food category"
                options={filterOptions.food_categories}
                selected={selectedCategories}
                onChange={setSelectedCategories}
              />
            )}
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

          <div className="quick-filters">
            <label className="open-now-filter">
              <input
                type="checkbox"
                checked={selectedOpenNow}
                onChange={event => setSelectedOpenNow(event.target.checked)}
              />
              Open now
            </label>

            <label className="open-now-filter">
              <input
                type="checkbox"
                checked={selectedHiddenGems}
                onChange={event => setSelectedHiddenGems(event.target.checked)}
              />
              Hidden Gems
            </label>
          </div>
        </details>

        {hasUnappliedChanges && (
          <p role="status">
            {isMobileLayout
              ? "Changes not applied. Choose Show results."
              : "Results update automatically once your filter selections are valid and the location picker is closed."}
          </p>
        )}

          <div className="filter-drawer__actions">
            <button type="button" onClick={handleClearSearch}>
              Clear search and filters
            </button>

            <button
              type="submit"
              disabled={locationStatus === "loading" || showLocationPicker}
            >
              Show results
            </button>
          </div>
        </ResponsiveFilters>

      </form>

      {appliedFilterLabels.length > 0 && (
        <section className="filter-summary" aria-label="Applied filters">
          <div className="filter-summary__header">
            <strong>Applied filters</strong>

            <button type="button" onClick={handleClearSearch}>
              Clear search and filters
            </button>
          </div>

          <ul className="filter-summary__items">
            {appliedFilterLabels.map(label => (
              <li key={label}>{label}</li>
            ))}
          </ul>

          {appliedLocation && appliedRadius !== "" && (
            <small>Distance is measured in a straight line.</small>
          )}

          {isFoodDiscovery && (
            <small>
              Clearing filters keeps your selected food.
            </small>
          )}
        </section>
      )}

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
            <div className="view-switch">
              <button
                type="button"
                aria-haspopup="dialog"
                aria-expanded={mobileView === "map"}
                onClick={() => {
                  setFiltersOpen(false);
                  setMobileView("map");
                }}
              >
                Show map
              </button>
            </div>
          )}

          <div
            className={`discovery-results ${restaurants.length === 0 ? "discovery-results--empty" : ""
              }`}
            data-mobile-view={mobileView}
          >
            {restaurants.length > 0 && (
              <ResponsiveFilters
                open={mobileView === "map" && !filtersOpen}
                onClose={closeMap}
                title="Restaurant map"
                variant="map"
                desktopClassName="discovery-map-panel"
              >
                <RestaurantMap
                  restaurants={restaurants}
                  onSelectRestaurant={handleMapSelect}
                  searchLocation={appliedLocation}
                  radiusKm={appliedRadius}
                />
              </ResponsiveFilters>
            )}

            <div className="discovery-list-panel">
              {restaurants.length === 0 ? (
                <section className="empty-state" role="status">
                  <h2>
                    {total > 0
                      ? "No restaurants on this page"
                      : appliedLocation
                        ? "No restaurants found in this area"
                        : "No matching restaurants"}
                  </h2>

                  <p>
                    {total > 0
                      ? "Return to the first page to view available results."
                      : "Try changing location, increasing the distance or clearing your filters."}
                  </p>

                  {total > 0 ? (
                    <button type="button" onClick={() => setPage(1)}>
                      Return to first page
                    </button>
                  ) : (
                    <button type="button" onClick={handleClearSearch}>
                      Clear search and filters
                    </button>
                  )}

                  {isFoodDiscovery && total === 0 && (
                    <p>
                      Your selected food remains active. You can also choose another food above.                      
                    </p>
                  )}
                </section>
              ) : (
                <RestaurantList
                  restaurants={restaurants}
                  selectedRestaurantId={selectedRestaurantId}
                />
             )}
            </div>
          </div>

        {totalPages > 0 && (
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
        )}
        </section>
      )}
    </Container>
  );
}

export default RestaurantDiscovery;
