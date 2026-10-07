import { useCallback, useEffect, useRef, useState } from "react";
import { FavouritesContext } from "./favouritesContext";
import {
  getFavouriteIds,
  setRestaurantFavourite,
  getFoodFavourites,
  setFoodFavourite,
} from "../api/favourites";

export default function FavouritesProvider({ children }) {
  const [ids, setIds] = useState(new Set());
  const [foodCategories, setFoodCategories] = useState(new Set());
  const [status, setStatus] = useState("loading");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [revision, setRevision] = useState(0);

  const generation = useRef(0);
  const mutating = useRef(false);

  const refresh = useCallback(async () => {
    const currentGeneration = ++generation.current;

    mutating.current = false;
    setBusy(false);
    setIds(new Set());
    setFoodCategories(new Set());
    setStatus("loading");
    setError("");

    try {
      const [result, foodResult] = await Promise.all([
        getFavouriteIds(),
        getFoodFavourites(),
      ]);

      if (generation.current !== currentGeneration) return;

      setIds(new Set(result.restaurant_ids));
      setFoodCategories(new Set(foodResult.categories));
      setStatus("ready");
      setRevision(value => value + 1);
    } catch (requestError) {
      if (generation.current !== currentGeneration) return;

      setStatus(requestError.status === 401 ? "guest" : "error");
      setError(
        requestError.status === 401 ? "" : requestError.message
      );
    }
  }, []);

  useEffect(() => {
    refresh();

    function handleFocus() {
      if (!mutating.current) refresh();
    }

    window.addEventListener("focus", handleFocus);
    window.addEventListener("seekmakan:session-changed", refresh);

    return () => {
      generation.current += 1;
      window.removeEventListener("focus", handleFocus);
      window.removeEventListener("seekmakan:session-changed", refresh);
    };
  }, [refresh]);

  async function changeFavourite(value, saved, kind = "restaurant") {
    if (mutating.current || status !== "ready") return;

    const currentGeneration = generation.current;
    mutating.current = true;
    setBusy(true);

    try {
      if (kind === "food") {
        await setFoodFavourite(value, saved);
      } else {
        await setRestaurantFavourite(value, saved);
      }

      if (generation.current !== currentGeneration) return;

      const updateState = kind === "food" ? setFoodCategories : setIds;

      updateState(current => {
        const next = new Set(current);

        if (saved) next.add(value);
        else next.delete(value);

        return next;
      });

      setRevision(current => current + 1);
    } catch (requestError) {
      if (generation.current !== currentGeneration) return;

      if (requestError.status === 401) {
        setIds(new Set());
        setFoodCategories(new Set());
        setStatus("guest");
      }

      throw requestError;
    } finally {
      if (generation.current === currentGeneration) {
        mutating.current = false;
        setBusy(false);
      }
    }
  }
    return (
    <FavouritesContext.Provider
      value={{
        ids,
        foodCategories,
        status,
        error,
        busy,
        revision,
        refresh,
        changeFavourite,
      }}
    >
      {children}
    </FavouritesContext.Provider>
  );
}
