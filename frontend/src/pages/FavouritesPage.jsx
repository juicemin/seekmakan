import { useContext, useEffect, useState } from "react";
import { Link } from "react-router";
import { getFavourites } from "../api/favourites";
import { FavouritesContext } from "../context/favouritesContext";
import RestaurantCard from "../components/RestaurantCard";
import FavouriteButton from "../components/FavouriteButton";
import FavouritesExport from "../components/FavouritesExport";

export default function FavouritesPage() {
  const { status, error, revision, refresh } = useContext(FavouritesContext);
  const [page, setPage] = useState(1);
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState("");
  const [retry, setRetry] = useState(0);

  useEffect(() => {
    if (status !== "ready") {
      setData(null);
      return;
    }

    let cancelled = false;
    setLoading(true);
    setLoadError("");

    getFavourites(page)
      .then(result => {
        if (cancelled) return;

        const lastPage = Math.max(1, result.total_pages);

        if (page > lastPage) {
          setPage(lastPage);
          return;
        }

        setData(result);
      })
      .catch(requestError => {
        if (cancelled) return;

        if (requestError.status === 401) {
          refresh();
        } else {
          setLoadError(requestError.message);
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [status, revision, page, retry, refresh]);

  if (status === "guest") {
    return (
      <main className="page">
        <h1>Favourites</h1>
        <p>Log in to save restaurants and view your favourites.</p>
        <Link to="/favourites?auth=login">Log in</Link>
      </main>
    );
  }

  if (status === "error") {
    return (
      <main className="page">
        <h1>Favourites</h1>
        <p role="alert">{error}</p>
        <button type="button" onClick={refresh}>Try again</button>
      </main>
    );
  }

  return (
    <main className="page">
      <h1>Favourites</h1>
      <p>
        Your saved restaurants. Add places to your wheel selections
        when you need help deciding where to eat.
      </p>

      {status === "ready" && (
        <FavouritesExport
          key={revision}
          onSessionExpired={refresh}
        />
      )}

      {status === "loading" || loading ? (
        <p>Loading favourites…</p>
      ) : loadError ? (
        <>
          <p role="alert">{loadError}</p>
          <button type="button" onClick={() => setRetry(value => value + 1)}>
            Try again
          </button>
        </>
      ) : data?.total === 0 ? (
        <section className="empty-state">
          <h2>No favourites yet</h2>
          <p>Save restaurants while exploring to find them here later.</p>
          <Link to="/restaurants">Explore restaurants</Link>
        </section>
      ) : data ? (
        <>
          <p>{data.total} saved restaurants</p>

          <section className="restaurant-grid" aria-label="Favourite restaurants">
            {data.items.map(item =>
              item.restaurant ? (
                <RestaurantCard
                  key={item.restaurant_id}
                  restaurant={item.restaurant}
                />
              ) : (
                <article
                  className="restaurant-card"
                  key={item.restaurant_id}
                >
                  <h2>Restaurant unavailable</h2>
                  <p>This restaurant is no longer available to view.</p>
                  <FavouriteButton restaurantId={item.restaurant_id} />
                </article>
              )
            )}
          </section>

          {data.total_pages > 1 && (
            <nav className="pagination" aria-label="Favourites pages">
              <button
                type="button"
                disabled={page === 1}
                onClick={() => setPage(value => value - 1)}
              >
                Previous
              </button>

              <span>Page {page} of {data.total_pages}</span>

              <button
                type="button"
                disabled={page >= data.total_pages}
                onClick={() => setPage(value => value + 1)}
              >
                Next
              </button>
            </nav>
          )}
        </>
      ) : null}
    </main>
  );
}