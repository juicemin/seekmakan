import { API_BASE_URL } from "../config";

async function requestFavourites(path, method = "GET") {
  let response;

  try {
    response = await fetch(`${API_BASE_URL}/api/favourites/${path}`, {
      method,
      credentials: "include",
      cache: "no-store",
      headers: {
        "X-Requested-With": "SeekMakan",
      },
    });
  } catch {
    throw new Error("Cannot reach the favourites service.");
  }

  const data = await response.json().catch(() => ({}));

  if (!response.ok) {
    const error = new Error(
      typeof data.detail === "string"
        ? data.detail
        : "The favourites request could not be completed."
    );
    error.status = response.status;
    throw error;
  }

  return data;
}

export function getFavouriteIds() {
  return requestFavourites("restaurant-ids");
}

export function getFavourites(page = 1) {
  return requestFavourites(`restaurants?page=${page}&page_size=10`);
}

export function setRestaurantFavourite(restaurantId, saved) {
  return requestFavourites(
    `restaurants/${encodeURIComponent(restaurantId)}`,
    saved ? "PUT" : "DELETE"
  );
}

export function getFoodFavourites() {
  return requestFavourites("foods");
}

export function setFoodFavourite(category, saved) {
  const query = new URLSearchParams({ category });

  return requestFavourites(
    `foods?${query.toString()}`,
    saved ? "PUT" : "DELETE"
  );
}