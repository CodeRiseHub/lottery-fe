// src/api.js
import { getSessionToken, clearSessionToken, storeSessionToken } from "./auth/sessionManager";
import { bootstrapSession } from "./auth/authService";

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || "http://localhost:8080";

let isReauthenticating = false;
let reauthPromise = null;

/**
 * Gets raw Telegram initData for session bootstrap.
 */
function getRawInitData() {
  const tg = window.Telegram?.WebApp;
  const raw = tg?.initData;
  return raw || "";
}

/**
 * Authenticated fetch with Bearer token.
 * Automatically handles 401 by re-authenticating.
 */
async function authFetch(path, options = {}) {
  let sessionToken = getSessionToken();
  
  // Ensure token is a string, not an object
  if (sessionToken && typeof sessionToken !== 'string') {
    sessionToken = String(sessionToken).trim();
    if (sessionToken === 'null' || sessionToken === 'undefined' || sessionToken === '[object Object]') {
      sessionToken = null;
    }
  }

  if (!sessionToken) {
    // No session token, try to bootstrap
    try {
      const sessionResult = await bootstrapSession();
      if (sessionResult) {
        sessionToken = getSessionToken();
        // Ensure it's a string
        if (sessionToken && typeof sessionToken !== 'string') {
          sessionToken = String(sessionToken).trim();
        }
        if (!sessionToken || sessionToken === 'null' || sessionToken === 'undefined' || sessionToken === '[object Object]') {
          throw new Error("Failed to get valid session token after bootstrap");
        }
        // Retry with new token
        return authFetch(path, options);
      }
    } catch (e) {
      throw new Error("Authentication required");
    }
  }

  const url = `${API_BASE_URL}${path}`;

  const response = await fetch(url, {
    ...options,
    headers: {
      ...(options.headers || {}),
      "Content-Type": "application/json",
      "Authorization": `Bearer ${sessionToken}`
    }
  });

  // Handle 401 Unauthorized - session expired or invalid
  if (response.status === 401) {
    // Clear invalid token
    clearSessionToken();
    
    // Re-authenticate (only once at a time)
    if (!isReauthenticating) {
      isReauthenticating = true;
      reauthPromise = bootstrapSession();
    }
    
    try {
      await reauthPromise;
      isReauthenticating = false;
      reauthPromise = null;
      
      // Retry the original request with new token
      const newToken = getSessionToken();
      if (newToken) {
        return authFetch(path, options);
      }
    } catch (e) {
      isReauthenticating = false;
      reauthPromise = null;
    }
    
    // If re-auth failed, throw error
    const error = new Error("Authentication failed");
    error.response = { status: 401, message: "Unauthorized" };
    throw error;
  }

  if (!response.ok) {
    let errorBody = "";
    let errorData = null;
    try {
      errorBody = await response.text();
      try {
        errorData = JSON.parse(errorBody);
      } catch (e) {
        // Not JSON, keep as text
      }
    } catch (e) {
      errorBody = "<unable to parse error body>";
    }

    const error = new Error(errorData?.message || `Request failed with status ${response.status}`);
    error.response = {
      status: response.status,
      code: errorData?.code,
      message: errorData?.message
    };
    throw error;
  }

  if (response.status === 204) return null;
  
  const contentType = response.headers.get("content-type");
  const text = await response.text();
  
  if (!text || text.trim() === "") {
    return null;
  }
  
  if (contentType?.includes("application/json")) {
    try {
      return JSON.parse(text);
    } catch (e) {
      return null;
    }
  }
  
  return null;
}

/**
 * Fetches current user information from backend.
 */
export async function fetchCurrentUser() {
  return authFetch("/api/users/current", { method: "GET" });
}

/**
 * Logs out by invalidating the session.
 */
export async function logout() {
  try {
    await authFetch("/api/auth/logout", { method: "POST" });
  } catch (e) {
    // Ignore logout errors
  } finally {
    clearSessionToken();
  }
}

/**
 * Fetches the last 10 completed rounds for a specific room.
 */
export async function fetchCompletedRounds(roomNumber) {
  return authFetch(`/api/game/room/${roomNumber}/completed-rounds`, { method: "GET" });
}

/**
 * Deposits stars to user's balance.
 * @param {number} stars - Number of stars to deposit
 */
export async function depositStars(stars) {
  return authFetch("/api/users/deposit", {
    method: "POST",
    body: JSON.stringify({ stars })
  });
}

// Export authFetch for use in other modules if needed
export { authFetch };

