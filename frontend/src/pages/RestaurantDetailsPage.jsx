import {useEffect, useState} from "react";
import { Link, useLocation, useParams } from "react-router";
import {getRestaurant} from "../api/restaurants";
import OpeningStatus from "../components/OpeningStatus";
import HiddenGemBadge from "../components/HiddenGemBadge";
import AddToWheelButton from "../components/AddToWheelButton";
import ManualWheelSummary from "../components/ManualWheelSummary";
import RestaurantActions from "../components/RestaurantActions";
import RestaurantPhotoGallery from "../components/RestaurantPhotoGallery";
const WEEKDAYS = [
  "monday",
  "tuesday",
  "wednesday",
  "thursday",
  "friday",
  "saturday",
  "sunday",
];

function formatOperatingHours(hours) {
  if (!hours) return "Not provided";

  if (hours.status === "closed") {
    return "Closed";
  }

  if (hours.status === "open_24_hours") {
    return "Open 24 hours";
  }

  if (!hours.open || !hours.close) {
    return "Not provided";
  }

  return `${hours.open} – ${hours.close}`;
}

function RestaurantDetailsPage() {
  const {restaurantId} = useParams();
  const routeLocation = useLocation();
const requestedReturn = routeLocation.state?.returnTo;

const returnPages = {
  "/": "Restaurant Discovery",
  "/restaurants": "Restaurant Discovery",
  "/food": "Food Discovery",
  "/decide": "Decide For Me",
};

const returnPath =
  typeof requestedReturn === "string"
    ? requestedReturn.split(/[?#]/)[0]
    : "";

const validReturn = Object.hasOwn(returnPages, returnPath);
const returnTo = validReturn ? requestedReturn : "/restaurants";

const returnLabel = validReturn
  ? returnPages[returnPath]
  : "restaurant discovery";
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
    <main className="page restaurant-details-page">
      <Link className="back-link" to={returnTo}>
        ← Back to {returnLabel}
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

            <div className="restaurant-details__title-row">
              <h1>{restaurant.name}</h1>

              <div className="restaurant-details__header-actions">
                <AddToWheelButton restaurant={restaurant} />

                <RestaurantActions
                  key={restaurant.id}
                  restaurant={restaurant}
                  variant="share"
                />
              </div>
            </div>

            <p>
              <OpeningStatus status={restaurant.opening_status} />
              {" "}
              <HiddenGemBadge eligible={restaurant.is_hidden_gem} />
            </p>

            <p>
              {restaurant.description ||
                "No description is available."}
            </p>
          </header>

          <RestaurantPhotoGallery
            photos={restaurant.photos ?? []}
            kind="restaurant"
            title="Restaurant photos"
          />

          <section>
            <h2>Location</h2>

            <address>
              <p>{restaurant.address.full_address}</p>
            </address>

            <RestaurantActions
              key={restaurant.id}
              restaurant={restaurant}
            />
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

          <RestaurantPhotoGallery
            photos={restaurant.photos ?? []}
            kind="food"
            title="Food photos"
          />

          <section>
            <h2>Opening hours</h2>

            <dl className="opening-hours">
              {WEEKDAYS.map(day => {
                const hours = restaurant.operating_hours?.[day];

                return (
                  <div className="opening-hours__row" key={day}>
                    <dt>
                      {day.charAt(0).toUpperCase() + day.slice(1)}
                    </dt>

                  <dd>
                    {formatOperatingHours(hours)}
                  </dd>
                  
                </div>
              );
            })}
          </dl>
        </section>

          <section>
            <h2>Rating</h2>

            <p>
              {restaurant.review_count > 0
                ? `${restaurant.average_rating.toFixed(1)} from ${restaurant.review_count} reviews`
                : "No reviews yet."}
            </p>
          </section>
        </article>
      )}
      <ManualWheelSummary />
    </main>
  );
}

export default RestaurantDetailsPage;
