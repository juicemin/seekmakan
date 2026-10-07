import { useContext, useState } from "react";
import { useLocation, useNavigate } from "react-router";
import { FavouritesContext } from "../context/favouritesContext";

export default function FavouriteButton({ restaurantId, foodCategory }) {
  const favourites = useContext(FavouritesContext);
  const location = useLocation();
  const navigate = useNavigate();
  const [error, setError] = useState("");

  const isFood = typeof foodCategory === "string";
  const value = isFood ? foodCategory : restaurantId;

  const saved = isFood
    ? favourites.foodCategories.has(value)
    : favourites.ids.has(value);

  async function handleClick() {
    setError("");

    if (favourites.status === "guest") {
      const parameters = new URLSearchParams(location.search);
      parameters.set("auth", "login");

      navigate(
        `${location.pathname}?${parameters.toString()}${location.hash}`
      );
      return;
    }

    if (favourites.status === "error") {
      await favourites.refresh();
      return;
    }

    try {
      await favourites.changeFavourite(
        value,
        !saved,
          isFood ? "food" : "restaurant"
      );
    } catch (requestError) {
      setError(requestError.message);
    }
  }

  return (
    <div className="favourite-control">
      <button
        type="button"
        onClick={handleClick}
        disabled={favourites.status === "loading" || favourites.busy}
        aria-pressed={saved}
      >
        {favourites.status === "loading"
          ? "Checking favourites…"
          : favourites.status === "error"
            ? "Retry favourites"
            : saved
              ? isFood
                ? "Remove food from favourites"
                : "Remove from favourites"
              : isFood
                ? "Save food to favourites"
                : "Save to favourites"
        }
      </button>

      {error && <small role="alert">{error}</small>}
    </div>
  );
}