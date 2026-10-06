import { API_BASE_URL } from "../config";

async function requestCandidates(path, payload, { signal } = {}) {
  const response = await fetch(`${API_BASE_URL}/api/decisions/${path}`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Accept: "application/json",
    },
    body: JSON.stringify(payload),
    signal,
  });

  if (!response.ok) {
    let message = "Could not load wheel options. Please try again.";

    try {
      const data = await response.json();

      if (typeof data.detail === "string") {
        message = data.detail;
      }
    } catch {
      // Keep the fallback message when the response is not JSON.
    }

    throw new Error(message);
  }

  return response.json();
}

export function getDecisionCandidates(payload, options = {}) {
  return requestCandidates("candidates", payload, options);
}

export function getFoodDecisionCandidates(payload, options = {}) {
  return requestCandidates("food-candidates", payload, options);
}