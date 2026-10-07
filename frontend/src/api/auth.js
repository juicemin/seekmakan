import { API_BASE_URL } from "../config";

async function requestAuth(path, options = {}) {
  let response;

  try {
    response = await fetch(`${API_BASE_URL}/api/auth/${path}`, {
      ...options,
      credentials: "include",
      cache: "no-store",
      headers: {
        "X-Requested-With": "SeekMakan",
        ...(options.body ? { "Content-Type": "application/json" } : {}),
      },
    });
  } catch {
    throw new Error("Cannot reach the account service. Please try again.");
  }

  const data = await response.json().catch(() => ({}));

  if (!response.ok) {
    let message = "The request could not be completed.";

    if (typeof data.detail === "string") {
      message = data.detail;
    } else if (Array.isArray(data.detail)) {
      message = data.detail.map(item => item.msg).join(" ");
    }

    throw new Error(message);
  }

  return data;
}

export function postAuth(path, body = {}) {
  return requestAuth(path, {
    method: "POST",
    body: JSON.stringify(body),
  });
}

export function getSession() {
  return requestAuth("me");
}