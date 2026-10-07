import { Link, useLocation } from "react-router";
import OpeningStatus from "./OpeningStatus";
import HiddenGemBadge from "./HiddenGemBadge";
import AddToWheelButton from "./AddToWheelButton";
import RestaurantPhoto from "./RestaurantPhoto";
import FavouriteButton from "./FavouriteButton";

function RestaurantCard({restaurant, isSelected = false, allowAddToWheel = true}) {
  const routeLocation = useLocation();
  const coverPhoto = restaurant.photos?.find(
    photo => photo.kind === "restaurant",
  );

  const cuisines = 
    restaurant.cuisines?.length > 0
      ? restaurant.cuisines.join(", ")
      : "Cuisine information unavailable";

    const location = [
      restaurant.address?.city,
      restaurant.address?.state,
    ]

    .filter(Boolean)
    .join(", ");

     return (
    <article
    id={`restaurant-${restaurant.id}`}
    tabIndex={-1}
    aria-labelledby={`restaurant-title-${restaurant.id}`}
    className={`restaurant-card ${
    isSelected ? "restaurant-card--selected" : ""
    }`}
    >
      <div className="restaurant-card__content">
        <h2
          id={`restaurant-title-${restaurant.id}`}
          className="restaurant-card__title"
        >
          {restaurant.name}
        </h2>

        {coverPhoto && (
          <RestaurantPhoto
            photo={coverPhoto}
            className="restaurant-card__photo"
          />
        )}

        <p className="restaurant-badges">
          <OpeningStatus status={restaurant.opening_status} />
          <HiddenGemBadge eligible={restaurant.is_hidden_gem} />
        </p>

        <p className="restaurant-card__location">
          {location || "Location unavailable"}
        </p>

        <p>{cuisines}</p>

        <dl className="restaurant-card__facts">
          <div>
            <dt>Price</dt>
            <dd>
              {restaurant.price_range ?? "Unavailable"}
            </dd>
          </div>

          <div>
            <dt>Rating</dt>
            <dd>
              {restaurant.review_count > 0
                ? `${restaurant.average_rating.toFixed(1)} (${restaurant.review_count})`
                : "No reviews yet"}
            </dd>
          </div>
        </dl>
        
        <div className="restaurant-card__actions">
        <Link
          className="restaurant-card__link"
          to={`/restaurants/${restaurant.id}`}
          state={{
            returnTo: routeLocation.pathname + routeLocation.search,
          }}
        >
          View details
        </Link>
        {allowAddToWheel && (
          <AddToWheelButton restaurant={restaurant} />
        )}

        <FavouriteButton restaurantId={restaurant.id} />
        </div>
      </div>
    </article>
  );
}

export default RestaurantCard;
