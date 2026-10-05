import { API_BASE_URL } from "../config";

export async function searchLocations(query, { signal } = {}) {
  const params = new URLSearchParams({ q: query.trim() });

  const response = await fetch(
    `${API_BASE_URL}/api/locations/search?${params}`,
    {
      headers: { Accept: "application/json" },
      signal,
    },
  );

  if (!response.ok) {
    let message = "Location search failed. Please try again.";

    try {
      const data = await response.json();

      if (typeof data.detail === "string") {
        message = data.detail;
      }
    } catch {
      // Keep the fallback message if the server response is not JSON.
    }

    throw new Error(message);
  }

  return response.json();
}