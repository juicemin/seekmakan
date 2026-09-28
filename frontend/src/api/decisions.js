import { API_BASE_URL } from "../config";

export async function getDecisionCandidates(payload, { signal } = {}) {
  const response = await fetch(`${API_BASE_URL}/api/decisions/candidates`, {
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