import {API_BASE_URL} from "../config";
const RESTAURANTS_URL = `${API_BASE_URL}/api/restaurants`;

async function parseResponse(response) {
  if (response.ok) {
    return response.json();
  }

   let message = "Something went wrong while contacting the server.";

   try {
    const errorData = await response.json();

    if (typeof errorData.detail === "string") {
      message = errorData.detail;
    }
  } catch {
    // Keeps the default message when the response is not JSON.
  }

  throw new Error(message);
}

export async function getRestaurants({
  page = 1,
  pageSize = 20,
  search = "",
  cuisines = [],
  foodCategories = [],
  priceRange = "",
  minRating = "",
  location = null,
  radiusKm = "",
  signal,
} = {}) {
  const query = new URLSearchParams({
    page,
    page_size: pageSize,
    search,
  });

  cuisines.forEach(value => {
    query.append("cuisines", value);
  });

  foodCategories.forEach(value => {
    query.append("food_categories", value);
  });

  if (priceRange !== "") {
  query.set("price_range", priceRange);
}

if (minRating !== "") {
  query.set("min_rating", minRating);
}

if (location !== null && radiusKm !== "") {
  query.set("latitude", String(location.latitude));
  query.set("longitude", String(location.longitude));
  query.set("radius_km", String(radiusKm));
}

  const response = await fetch(`${RESTAURANTS_URL}?${query}`, {
    method: "GET",
    headers: {
      Accept: "application/json",
    },
    signal,
  });

  return parseResponse(response);
}

export async function getRestaurant(
  restaurantId,
  { signal } = {},
) {
  const encodedId = encodeURIComponent(restaurantId);

  const response = await fetch(
    `${RESTAURANTS_URL}/${encodedId}`,
    {
      method: "GET",
      headers: {
        Accept: "application/json",
      },
      signal,
    },
  );

  return parseResponse(response);
}

export async function getRestaurantFilterOptions({ signal } = {}) {
  const response = await fetch(`${RESTAURANTS_URL}/filter-options`, {
    headers: {
      Accept: "application/json",
    },
    signal,
  });

  return parseResponse(response);
}