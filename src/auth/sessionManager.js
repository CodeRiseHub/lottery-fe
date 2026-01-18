// src/auth/sessionManager.js

const SESSION_STORAGE_KEY = "lottery_session_token";

/**
 * Checks if Telegram WebApp is available.
 */
function isTelegramWebAppAvailable() {
  return typeof window !== "undefined" && window.Telegram?.WebApp !== undefined;
}

/**
 * Stores the session token in memory, Telegram CloudStorage, and localStorage.
 * Uses all available storage methods to maximize persistence.
 */
export function storeSessionToken(token) {
  if (typeof window === "undefined") return;
  
  // Always store in memory for current session (fastest)
  window.__lotterySessionToken = token;
  console.debug("[SessionManager] Token stored in memory");
  
  // Try Telegram CloudStorage (persists in Telegram WebView)
  if (isTelegramWebAppAvailable()) {
    try {
      const tg = window.Telegram.WebApp;
      
      // Check if CloudStorage is available
      if (tg.CloudStorage) {
        try {
          tg.CloudStorage.setItem(SESSION_STORAGE_KEY, token);
          console.debug("[SessionManager] Token stored in Telegram CloudStorage");
        } catch (e) {
          console.warn("[SessionManager] CloudStorage.setItem failed:", e);
        }
      } else {
        console.debug("[SessionManager] Telegram CloudStorage not available");
      }
    } catch (e) {
      console.warn("[SessionManager] Failed to access Telegram storage:", e);
    }
  }
  
  // Also store in localStorage as backup (works in browsers, may work in some Telegram versions)
  try {
    localStorage.setItem(SESSION_STORAGE_KEY, token);
    console.debug("[SessionManager] Token stored in localStorage (backup)");
  } catch (e) {
    console.warn("[SessionManager] Failed to store in localStorage:", e);
  }
}

/**
 * Retrieves the session token from memory, Telegram CloudStorage, or localStorage.
 * Checks all sources to find the token.
 * Always returns a string or null (never an object).
 */
export function getSessionToken() {
  if (typeof window === "undefined") return null;
  
  // Try memory first (fastest, always available during session)
  if (window.__lotterySessionToken) {
    const token = String(window.__lotterySessionToken).trim();
    if (token && token !== 'null' && token !== 'undefined') {
      console.debug("[SessionManager] Token retrieved from memory");
      return token;
    }
  }
  
  // Try Telegram CloudStorage (persists in Telegram WebView)
  if (isTelegramWebAppAvailable()) {
    try {
      const tg = window.Telegram.WebApp;
      
      if (tg.CloudStorage && typeof tg.CloudStorage.getItem === 'function') {
        const token = tg.CloudStorage.getItem(SESSION_STORAGE_KEY);
        // Ensure it's a string, not an object
        const tokenStr = token ? String(token).trim() : null;
        if (tokenStr && tokenStr !== 'null' && tokenStr !== 'undefined' && tokenStr !== '[object Object]') {
          // Restore to memory for faster access
          window.__lotterySessionToken = tokenStr;
          console.debug("[SessionManager] Token retrieved from Telegram CloudStorage");
          return tokenStr;
        } else {
          console.debug("[SessionManager] No valid token found in Telegram CloudStorage");
        }
      } else {
        console.debug("[SessionManager] Telegram CloudStorage.getItem not available");
      }
    } catch (e) {
      console.warn("[SessionManager] Failed to read from Telegram CloudStorage:", e);
    }
  }
  
  // Fallback to localStorage (works in browsers)
  try {
    const token = localStorage.getItem(SESSION_STORAGE_KEY);
    if (token) {
      // Ensure it's a string, not an object
      const tokenStr = String(token).trim();
      if (tokenStr && tokenStr !== 'null' && tokenStr !== 'undefined' && tokenStr !== '[object Object]') {
        // Restore to memory for faster access
        window.__lotterySessionToken = tokenStr;
        console.debug("[SessionManager] Token retrieved from localStorage");
        return tokenStr;
      } else {
        console.debug("[SessionManager] Invalid token format in localStorage");
      }
    } else {
      console.debug("[SessionManager] No token found in localStorage");
    }
  } catch (e) {
    console.warn("[SessionManager] Failed to read from localStorage:", e);
  }
  
  console.debug("[SessionManager] No token found in any storage");
  return null;
}

/**
 * Clears the session token from all storage locations.
 */
export function clearSessionToken() {
  if (typeof window === "undefined") return;
  
  window.__lotterySessionToken = null;
  console.debug("[SessionManager] Token cleared from memory");
  
  // Clear from Telegram CloudStorage
  if (isTelegramWebAppAvailable()) {
    try {
      const tg = window.Telegram.WebApp;
      
      if (tg.CloudStorage && typeof tg.CloudStorage.removeItem === 'function') {
        tg.CloudStorage.removeItem(SESSION_STORAGE_KEY);
        console.debug("[SessionManager] Token cleared from Telegram CloudStorage");
      }
    } catch (e) {
      console.warn("[SessionManager] Failed to clear Telegram CloudStorage:", e);
    }
  }
  
  // Clear from localStorage
  try {
    localStorage.removeItem(SESSION_STORAGE_KEY);
    console.debug("[SessionManager] Token cleared from localStorage");
  } catch (e) {
    console.warn("[SessionManager] Failed to clear localStorage:", e);
  }
}


