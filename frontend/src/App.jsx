import { useEffect, useState } from "react";
import "./App.css";
import { API_BASE_URL } from "./config";

const API_URL = `${API_BASE_URL}/api/restaurants`;

function App() {
  const [restaurants, setRestaurants] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    async function loadRestaurants() {
      try {
        const response = await fetch(API_URL);

        if (!response.ok) {
          throw new Error("Unable to retrieve restaurants.");
        }

        const data = await response.json();
        setRestaurants(data);
      } catch (requestError) {
        setError(requestError.message);
      } finally {
        setIsLoading(false);
      }
    }

    loadRestaurants();
  }, []);

  if (isLoading) {
    return <main><p>Loading restaurants...</p></main>;
  }

  if (error) {
    return <main><p>{error}</p></main>;
  }

  return (
    <main>
      <h1>SeekMakan</h1>
      <h2>Restaurant Discovery</h2>

      {restaurants.length === 0 ? (
        <p>No restaurants are available.</p>
      ) : (
        <div>
          {restaurants.map((restaurant) => (
            <article key={restaurant.id}>
              <h3>{restaurant.name}</h3>
              <p>{restaurant.address}</p>
              <p>{restaurant.cuisines.join(", ")}</p>
              <p>{restaurant.price_range ?? "Price unavailable"}</p>
              <hr />
            </article>
          ))}
        </div>
      )}
    </main>
  );
}

export default App;