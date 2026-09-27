import { useEffect, useState } from "react";
import { useSearchParams } from "react-router";
import { getRestaurantFilterOptions } from "../api/restaurants";
import RestaurantDiscovery from "../components/RestaurantDiscovery";

const INITIAL_CATEGORY_COUNT = 12;

export default function FoodDiscoveryPage() {
  const [categories, setCategories] = useState([]);
  const [status, setStatus] = useState("loading");
  const [error, setError] = useState("");
  const [retry, setRetry] = useState(0);

  const [categorySearch, setCategorySearch] = useState("");
  const [searchParams, setSearchParams] = useSearchParams();
  const selectedCategory = searchParams.get("category") || null;

  function setSelectedCategory(category) {
    setSearchParams(current => {
        const next = new URLSearchParams(current);

        if (category === null) {
            next.delete("category");
        } else {
            next.set("category", category);
        }

        return next;
    });
}
  const [showAll, setShowAll] = useState(false);

  useEffect(() => {
    const controller = new AbortController();
    let active = true;

    async function loadCategories() {
      setStatus("loading");
      setError("");

      try {
        const data = await getRestaurantFilterOptions({
          signal: controller.signal,
        });

        if (!active) return;

        setCategories(data.food_categories);
        setStatus("success");
      } catch (requestError) {
        if (!active || requestError.name === "AbortError") return;

        setError(requestError.message);
        setStatus("error");
      }
    }

    loadCategories();

    return () => {
      active = false;
      controller.abort();
    };
  }, [retry]);

  const searchTerm = categorySearch.trim().toLowerCase();

  const matchingCategories = categories.filter(category =>
    category.toLowerCase().includes(searchTerm)
  );

  const visibleCategories =
    showAll || searchTerm
      ? matchingCategories
      : matchingCategories.slice(0, INITIAL_CATEGORY_COUNT);

  return (
    <main className="page discovery-page">
      <header className="page-header">
        <p className="eyebrow">SeekMakan</p>
        <h1>Food Discovery</h1>
        <p>What would you like to eat?</p>
      </header>

      <section
        className="food-chooser"
        aria-labelledby="food-chooser-title"
      >
        <h2 id="food-chooser-title">Choose a food category</h2>

        <label htmlFor="food-category-search">
          Search food categories
        </label>

        <input
          id="food-category-search"
          className="food-category-search"
          type="search"
          placeholder="For example, Nasi Lemak or Noodles"
          value={categorySearch}
          onChange={event => {
            setCategorySearch(event.target.value);
            setShowAll(false);
          }}
          maxLength={100}
          disabled={status !== "success"}
        />

        {status === "loading" && (
          <p role="status">Loading food categories...</p>
        )}

        {status === "error" && (
          <div role="alert">
            <p>Food categories could not be loaded: {error}</p>
            <button
              type="button"
              onClick={() => setRetry(value => value + 1)}
            >
              Retry
            </button>
          </div>
        )}

        {status === "success" && (
          <>
            {categories.length === 0 ? (
              <p>Food categories aren’t available yet.</p>
            ) : matchingCategories.length === 0 ? (
              <p role="status">
                No matching food categories. Try another search.
              </p>
            ) : (
              <div
                className="food-category-grid"
                role="group"
                aria-label="Food categories"
              >
                {visibleCategories.map(category => (
                  <button
                    key={category}
                    type="button"
                    className="food-category-tile"
                    aria-pressed={selectedCategory === category}
                    onClick={() => setSelectedCategory(category)}
                  >
                    {category}
                  </button>
                ))}
              </div>
            )}

            {!searchTerm &&
              categories.length > INITIAL_CATEGORY_COUNT && (
                <button
                  type="button"
                  className="food-show-all"
                  onClick={() => setShowAll(value => !value)}
                >
                  {showAll ? "Show fewer" : "Show all categories"}
                </button>
              )}
          </>
        )}

        {selectedCategory !== null ? (
          <div className="food-selection">
            <p>
              Selected food: <strong>{selectedCategory}</strong>
            </p>
            <button
              type="button"
              onClick={() => setSelectedCategory(null)}
            >
              Clear food selection
            </button>
            <p>Changing food category resets the restaurant filters.</p>
          </div>
        ) : (
          status === "success" &&
          categories.length > 0 && (
            <p>Choose a food category to find restaurants serving it.</p>
          )
        )}
      </section>

      {selectedCategory !== null && (
        <RestaurantDiscovery
          key={selectedCategory}
          foodCategory={selectedCategory}
        />
      )}
    </main>
  );
}