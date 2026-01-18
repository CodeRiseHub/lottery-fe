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

  if (!raw) {
    console.warn("[API] Telegram WebApp.initData is EMPTY!");
  } else {
    console.debug(`[API] Telegram WebApp.initData present (${raw.length} chars)`);
  }

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
    console.warn("[API] Token is not a string, converting:", typeof sessionToken);
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
      } else {
        // No initData available (dev mode), continue without auth
        console.warn("[API] No session token and bootstrap returned null - request may fail");
      }
    } catch (e) {
      console.error("[API] Failed to bootstrap session:", e);
      throw new Error("Authentication required");
    }
  }

  const url = `${API_BASE_URL}${path}`;

  console.debug("[API] Calling:", API_BASE_URL + path, "with token type:", typeof sessionToken);

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
    console.warn("[API] Received 401, session may be expired. Re-authenticating...");
    
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
      console.error("[API] Re-authentication failed:", e);
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

    console.error("[API] Request FAILED:", response.status, errorBody);
    
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
      console.warn("[API] Failed to parse JSON response:", e);
      return null;
    }
  }
  
  return null;
}

/**
 * Fetches current user information from backend.
 */
export async function fetchCurrentUser() {
  console.debug("[API] Fetching current user...");
  return authFetch("/api/users/current", { method: "GET" });
}

/**
 * Logs out by invalidating the session.
 */
export async function logout() {
  console.debug("[API] Logging out...");
  try {
    await authFetch("/api/auth/logout", { method: "POST" });
  } catch (e) {
    console.warn("[API] Logout request failed:", e);
  } finally {
    clearSessionToken();
  }
}

/**
 * Fetches the last 10 completed rounds for a specific room.
 */
export async function fetchCompletedRounds(roomNumber) {
  console.debug("[API] Fetching completed rounds for room", roomNumber);
  return authFetch(`/api/game/room/${roomNumber}/completed-rounds`, { method: "GET" });
}

// Export authFetch for use in other modules if needed
export { authFetch };

