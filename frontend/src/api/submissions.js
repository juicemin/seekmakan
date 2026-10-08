import { API_BASE_URL } from "../config";

export function checkExistingRestaurants(query, signal) {
  return requestSubmissions(`/check-existing?q=${encodeURIComponent(query)}`, { signal });
}

export function getRestaurantNameSuggestions(query, signal) {
  return requestSubmissions(`/name-suggestions?q=${encodeURIComponent(query)}`, { signal });
}

async function requestSubmissions(path = "", options = {}) {
  let response;

  try {
    response = await fetch(`${API_BASE_URL}/api/submissions${path}`, {
      ...options,
      credentials: "include",
      cache: "no-store",
      headers: {
        "X-Requested-With": "SeekMakan",
        ...(options.body && !(options.body instanceof FormData)
            ? { "Content-Type": "application/json" }
            : {}),
      },
    });
  } catch (error) {
    if (error.name === "AbortError") throw error;

    throw new Error(
      "Cannot reach the submission service. Check My submissions before retrying."
    );
  }

  const data = await response.json().catch(() => ({}));

  if (!response.ok) {
    const message =
      typeof data.detail === "string"
        ? data.detail
        : Array.isArray(data.detail)
          ? data.detail.map(item => item.msg).join(" ")
          : "The submission request failed.";

    const error = new Error(message);
    error.status = response.status;
    throw error;
  }

  return data;
}

export function getMySubmissions(page = 1) {
  return requestSubmissions(`/mine?page=${page}&page_size=10`);
}

export function submitRestaurant(restaurant) {
  return requestSubmissions("", {
    method: "POST",
    body: JSON.stringify(restaurant),
  });
}

export function lookupRestaurants({
  query,
  area,
  radius,
  signal,
  external = false,
}) {
  const parameters = new URLSearchParams({
    q: query,
    latitude: area.latitude,
    longitude: area.longitude,
    radius_km: radius,
    external: String(external),
  });

  return requestSubmissions(`/lookup?${parameters}`, { signal });
}

export function withdrawSubmission(submissionId) {
  return requestSubmissions(
    `/${encodeURIComponent(submissionId)}/withdraw`,
    { method: "POST" }
  );
}

export function uploadSubmissionPhoto(submissionId, file, kind) {
  const body = new FormData();
  body.append("file", file);
  body.append("kind", kind);
  body.append("permission_confirmed", "true");

  return requestSubmissions(
    `/${encodeURIComponent(submissionId)}/photos`,
    {
      method: "POST",
      body,
    }
  );
}
