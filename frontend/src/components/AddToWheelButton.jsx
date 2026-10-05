import { useDecision } from "../context/decision-context";

export default function AddToWheelButton({ restaurant }) {
  const { manualRestaurants, addManualRestaurant } = useDecision();

  const alreadyAdded = manualRestaurants.some(
    item => item.id === restaurant.id,
  );

  return (
    <button
      type="button"
      className="restaurant-card__add"
      disabled={alreadyAdded}
      onClick={() => addManualRestaurant(restaurant)}
      aria-label={
        alreadyAdded
          ? `${restaurant.name} is added to your wheel selections`
          : `Add ${restaurant.name} to your wheel selections`
      }
    >
      {alreadyAdded ? "Added to wheel" : "Add to wheel"}
    </button>
  );
}