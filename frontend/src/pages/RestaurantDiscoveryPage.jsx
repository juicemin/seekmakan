import { useEffect, useState } from "react";
import { getRestaurants, getRestaurantFilterOptions } from "../api/restaurants";
import RestaurantList from "../components/RestaurantList";
import CheckboxDropdown from "../components/CheckboxDropdown";
import RestaurantMap from "../components/RestaurantMap";

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
          signal: controller.signal
        });

        if (!active) return;

        setRestaurants(data.items);
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

  function handleSearch(event) {
    event.preventDefault();

    setSearch(searchInput.trim());
    setAppliedCuisines([...selectedCuisines]);
    setAppliedCategories([...selectedCategories]);
    setAppliedPrice(selectedPrice);
    setAppliedRating(selectedRating);
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
    selectedRating !== appliedRating;

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

          <div className="discovery-results">
            {restaurants.length > 0 && (
            <RestaurantMap restaurants={restaurants} />
            )}

          <div>
            {restaurants.length === 0 && total > 0 ? (
            <p>No restaurants on this page. Return to the first page.</p>
            ) : (
              <RestaurantList restaurants={restaurants} />
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
