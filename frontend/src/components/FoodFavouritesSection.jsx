import { useContext } from "react";
import { Link } from "react-router";
import { FavouritesContext } from "../context/favouritesContext";
import FavouriteButton from "./FavouriteButton";

export default function FoodFavouritesSection() {
  const { foodCategories, status } = useContext(FavouritesContext);

  if (status === "loading") {
    return <p>Loading favourite foods…</p>;
  }

  if (status !== "ready") return null;

  const categories = [...foodCategories].sort((a, b) => a.localeCompare(b));

  if (categories.length === 0) {
    return (
      <section className="empty-state">
        <h2>No favourite foods yet</h2>
        <p>Choose a food in Food Discovery and save it here.</p>
        <Link to="/food">Explore foods</Link>
      </section>
    );
  }

  return (
    <section aria-label="Favourite foods">
      <p>{categories.length} saved foods</p>

      <div className="restaurant-grid">
        {categories.map(category => (
          <article className="restaurant-card" key={category}>
            <h2>{category}</h2>

            <p>
              <Link
                to={`/food?${new URLSearchParams({ category }).toString()}`}
              >
                Find restaurants serving this
              </Link>
            </p>

            <FavouriteButton foodCategory={category} />
          </article>
        ))}
      </div>
    </section>
  );
}