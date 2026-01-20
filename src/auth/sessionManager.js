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
  
  // Try Telegram CloudStorage (persists in Telegram WebView)
  if (isTelegramWebAppAvailable()) {
    try {
      const tg = window.Telegram.WebApp;
      
      // Check if CloudStorage is available
      if (tg.CloudStorage) {
        try {
          tg.CloudStorage.setItem(SESSION_STORAGE_KEY, token);
        } catch (e) {
          // Ignore CloudStorage errors
        }
      }
    } catch (e) {
      // Ignore Telegram storage errors
    }
  }
  
  // Also store in localStorage as backup (works in browsers, may work in some Telegram versions)
  try {
    localStorage.setItem(SESSION_STORAGE_KEY, token);
  } catch (e) {
    // Ignore localStorage errors
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
          return tokenStr;
        }
      }
    } catch (e) {
      // Ignore CloudStorage errors
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
        return tokenStr;
      }
    }
  } catch (e) {
    // Ignore localStorage errors
  }
  
  return null;
}

/**
 * Clears the session token from all storage locations.
 */
export function clearSessionToken() {
  if (typeof window === "undefined") return;
  
  window.__lotterySessionToken = null;
  
  // Clear from Telegram CloudStorage
  if (isTelegramWebAppAvailable()) {
    try {
      const tg = window.Telegram.WebApp;
      
      if (tg.CloudStorage && typeof tg.CloudStorage.removeItem === 'function') {
        tg.CloudStorage.removeItem(SESSION_STORAGE_KEY);
      }
    } catch (e) {
      // Ignore CloudStorage errors
    }
  }
  
  // Clear from localStorage
  try {
    localStorage.removeItem(SESSION_STORAGE_KEY);
  } catch (e) {
    // Ignore localStorage errors
  }
}


