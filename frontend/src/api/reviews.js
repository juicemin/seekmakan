import { API_BASE_URL } from "../config";

async function requestReviews(restaurantId, suffix = "", options = {}) {
  let response;

  try {
    response = await fetch(
      `${API_BASE_URL}/api/restaurants/${encodeURIComponent(restaurantId)}/reviews${suffix}`,
      {
        ...options,
        credentials: "include",
        cache: "no-store",
        headers: {
          "X-Requested-With": "SeekMakan",
          ...(options.body
            ? { "Content-Type": "application/json" }
            : {}),
        },
      }
    );
  } catch {
    throw new Error(
      "Cannot reach the review service. Refresh to check before retrying."
    );
  }

  const data = await response.json().catch(() => ({}));

  if (!response.ok) {
    const message =
      typeof data.detail === "string"
        ? data.detail
        : Array.isArray(data.detail)
          ? data.detail.map(item => item.msg).join(" ")
          : "The review request could not be completed.";

    const error = new Error(message);
    error.status = response.status;
    throw error;
  }

  return data;
}

export function getReviews(restaurantId, page = 1) {
  return requestReviews(
    restaurantId,
    `?page=${page}&page_size=10`
  );
}

export function getOwnReview(restaurantId) {
  return requestReviews(restaurantId, "/mine");
}

export function saveReview(restaurantId, review) {
  return requestReviews(restaurantId, "/mine", {
    method: "PUT",
    body: JSON.stringify(review),
  });
}

export function deleteReview(restaurantId) {
  return requestReviews(restaurantId, "/mine", {
    method: "DELETE",
  });
}