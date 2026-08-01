import {Link} from "react-router";

function RestaurantCard({restaurant}) {
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
    <article className="restaurant-card">
      <div className="restaurant-card__content">
        <h2 className="restaurant-card__title">
          {restaurant.name}
        </h2>

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

        <Link
          className="restaurant-card__link"
          to={`/restaurants/${restaurant.id}`}
        >
          View details
        </Link>
      </div>
    </article>
  );
}

export default RestaurantCard;
