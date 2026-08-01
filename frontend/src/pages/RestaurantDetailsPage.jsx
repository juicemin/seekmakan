import {useEffect, useState} from "react";
import {Link, useParams} from "react-router";
import {getRestaurant} from "../api/restaurants";

function RestaurantDetailsPage() {
  const {restaurantId} = useParams();
  const [restaurant, setRestaurant] = useState(null);
  const [status, setStatus] = useState("loading");
  const [error, setError] = useState("");

  useEffect(() => {
    const controller = new AbortController();

    async function loadRestaurant() {
      setStatus("loading");
      setError("");

      try {
        const data = await getRestaurant(
          restaurantId,
          { signal: controller.signal },
        );

        setRestaurant(data);
        setStatus("success");
      } catch (requestError) {
        if (requestError.name === "AbortError") {
          return;
        }

        setError(requestError.message);
        setStatus("error");
      }
    }

    loadRestaurant();

    return () => {
      controller.abort();
    };
  }, [restaurantId]);

  return (
    <main className="page">
      <Link
        className="back-link"
        to="/restaurants"
      >
        ← Back to restaurants
      </Link>

      {status === "loading" && (
        <section
          className="status-message"
          aria-live="polite"
        >
          <p>Loading restaurant details...</p>
        </section>
      )}

      {status === "error" && (
        <section
          className="status-message status-message--error"
          role="alert"
        >
          <h1>Restaurant unavailable</h1>
          <p>{error}</p>
        </section>
      )}

      {status === "success" && restaurant && (
        <article className="restaurant-details">
          <header>
            <p className="eyebrow">
              {restaurant.verification_status}
            </p>

            <h1>{restaurant.name}</h1>

            <p>
              {restaurant.description ||
                "No description is available."}
            </p>
          </header>

          <section>
            <h2>Location</h2>
            <address>
              <p>{restaurant.address.full_address}</p>
              <p>
                {restaurant.address.city},{" "}
                {restaurant.address.state}
              </p>

              {restaurant.address.postcode && (
                <p>{restaurant.address.postcode}</p>
              )}
            </address>
          </section>

          <section>
            <h2>Food information</h2>

            <p>
              <strong>Cuisines: </strong>
              {restaurant.cuisines.length > 0
                ? restaurant.cuisines.join(", ")
                : "Unavailable"}
            </p>

            <p>
              <strong>Food categories: </strong>
              {restaurant.food_categories.length > 0
                ? restaurant.food_categories.join(", ")
                : "Unavailable"}
            </p>

            <p>
              <strong>Price range: </strong>
              {restaurant.price_range ?? "Unavailable"}
            </p>
          </section>

          <section>
            <h2>Rating</h2>

            <p>
              {restaurant.review_count > 0
                ? `${restaurant.average_rating.toFixed(1)} from ${restaurant.review_count} reviews`
                : "No reviews have been submitted yet."}
            </p>
          </section>
        </article>
      )}
    </main>
  );
}

export default RestaurantDetailsPage;
