// src/auth/authService.js
import { storeSessionToken, getSessionToken } from "./sessionManager";

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || "http://localhost:8080";

/**
 * Gets raw Telegram initData.
 */
function getRawInitData() {
  const tg = window.Telegram?.WebApp;
  const raw = tg?.initData;

  if (!raw) {
    console.warn("[Auth] Telegram WebApp.initData is EMPTY!");
  } else {
    console.debug(`[Auth] Telegram WebApp.initData present (${raw.length} chars)`);
  }

  return raw || "";
}

/**
 * Bootstraps a session by sending initData to backend.
 * This is the only place where initData is sent.
 */
export async function bootstrapSession() {
  const initData = getRawInitData();

  if (!initData || initData.trim() === "") {
    // In dev mode without Telegram, we can't authenticate
    // Return null to indicate no session (but don't throw)
    console.warn("[Auth] No Telegram initData available - skipping session bootstrap");
    return null;
  }

  console.debug("[Auth] Bootstrapping session...");

  const response = await fetch(`${API_BASE_URL}/api/auth/tma/session`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json"
    },
    body: JSON.stringify({ initData })
  });

  if (!response.ok) {
    let errorMessage = "Failed to create session";
    try {
      const errorData = await response.json();
      errorMessage = errorData.message || errorMessage;
    } catch (e) {
      // Ignore
    }
    throw new Error(errorMessage);
  }

  const data = await response.json();
  const { access_token, expires_in } = data;

  if (!access_token) {
    throw new Error("No access token received from server");
  }

  // Store the session token
  storeSessionToken(access_token);

  console.debug(`[Auth] Session created, expires in ${expires_in} seconds`);

  return {
    access_token,
    expires_in
  };
}

/**
 * Checks if we have a valid session token.
 */
export function hasSession() {
  return getSessionToken() !== null;
}

