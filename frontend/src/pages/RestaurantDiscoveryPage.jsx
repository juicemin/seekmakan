import { useEffect, useState } from "react";
import { getRestaurants, getRestaurantFilterOptions } from "../api/restaurants";
import RestaurantList from "../components/RestaurantList";
import CheckboxDropdown from "../components/CheckboxDropdown";

function RestaurantDiscoveryPage() {
  const [restaurants, setRestaurants] = useState([]);
  const [status, setStatus] = useState("loading");
  const [error, setError] = useState("");
  const [page, setPage] = useState(1);
  const pageSize = 2;
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
  }, [page, pageSize, search, appliedCuisines, appliedCategories, retry]);

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
    selectedCategories.some(value => !appliedCategories.includes(value));

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
          {restaurants.length === 0 && total > 0
            ? <p>No restaurants on this page. Return to the first page.</p>
            : <RestaurantList restaurants={restaurants} />}

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
