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

export async function getRestaurants({ signal } = {}) {
  const response = await fetch(RESTAURANTS_URL, {
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