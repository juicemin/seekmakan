import RestaurantCard from "./RestaurantCard";

function RestaurantList({restaurants}) {
  if (restaurants.length === 0) {
    return (
      <section
        className="empty-state"
        aria-labelledby="empty-state-title"
      >
        <h2 id="empty-state-title">
          No restaurants found.
        </h2>

        <p>
          Try another search or change your filters. Clear resets both.
        </p>
      </section>
    );
  }

  return (
    <section
      className="restaurant-grid"
      aria-label="Restaurant results"
    >
      {restaurants.map((restaurant) => (
        <RestaurantCard
          key={restaurant.id}
          restaurant={restaurant}
        />
      ))}
    </section>
  );
}

export default RestaurantList;