import {useCallback, useEffect, useState} from "react";
import {getRestaurants} from "../api/restaurants";
import RestaurantList from "../components/RestaurantList";

function RestaurantDiscoveryPage() {
  const [restaurants, setRestaurants] = useState([]);
  const [status, setStatus] = useState("loading");
  const [error, setError] = useState("");

  const loadRestaurants = useCallback(
    async (signal) => {
      setStatus("loading");
      setError("");

    try {
        const data = await getRestaurants({ signal });

        setRestaurants(data);
        setStatus("success");
      } catch (requestError) {
        if (requestError.name === "AbortError") {
          return;
        }
        
         setError(requestError.message);
        setStatus("error");
      }
    },
    [],
  );

  useEffect(() => {
    const controller = new AbortController();

    loadRestaurants(controller.signal);

    return () => {
      controller.abort();
    };
  }, [loadRestaurants]);

  return (
    <main className="page">
      <header className="page-header">
        <p className="eyebrow">SeekMakan</p>
        <h1>Restaurant Discovery</h1>
        <p>
          Explore restaurants and discover food around Malaysia.
        </p>
      </header>

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
            onClick={() => loadRestaurants()}
          >
            Try again
          </button>
        </section>
      )}

      {status === "success" && (
        <RestaurantList restaurants={restaurants} />
      )}
    </main>
  );
}

export default RestaurantDiscoveryPage;