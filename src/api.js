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
 * @param {number} stars - Number of stars to deposit (will be converted to bigint: stars * 1,000,000)
 */
export async function depositStars(stars) {
  // Convert stars to bigint format (1 star = 1,000,000)
  const amount = stars * 1_000_000
  return authFetch("/api/users/deposit", {
    method: "POST",
    body: JSON.stringify({ amount })
  });
}

/**
 * Fetches referrals for a specific level with pagination.
 * Always returns 50 results per page (fixed on backend).
 * @param {number} level - The referral level (1, 2, or 3)
 * @param {number} page - Page number (0-indexed, defaults to 0)
 * @returns {Promise<{referrals: Array<{name: string, commission: number}>, currentPage: number, totalPages: number, totalElements: number}>}
 */
export async function fetchReferrals(level, page = 0) {
  return authFetch(`/api/users/referrals?level=${level}&page=${page}`, {
    method: "GET"
  });
}

/**
 * Fetches tasks for a specific type (referral, follow, other).
 * @param {string} type - The task type
 * @returns {Promise<Array<{id: number, type: string, requirement: number, rewardAmount: number, rewardType: string, title: string, description: string, displayOrder: number, claimed: boolean, progress: string}>>}
 */
export async function fetchTasks(type) {
  return authFetch(`/api/tasks?type=${type}`, {
    method: "GET"
  });
}

/**
 * Claims a task for the current user.
 * @param {number} taskId - The task ID to claim
 * @returns {Promise<{success: boolean, message: string}>}
 */
export async function claimTask(taskId) {
  return authFetch("/api/tasks/claim", {
    method: "POST",
    body: JSON.stringify({ taskId })
  });
}

/**
 * Fetches the last 100 game history entries for the current user.
 * @returns {Promise<Array<{amount: number, date: string}>>}
 */
export async function fetchGameHistory() {
  return authFetch("/api/game/history", { method: "GET" });
}

/**
 * Creates a payout request.
 * @param {Object} payoutData - Payout data
 * @param {string} payoutData.username - Username (must start with @)
 * @param {number} payoutData.total - Tickets amount in bigint format (already converted)
 * @param {number} payoutData.starsAmount - Stars amount (for STARS type)
 * @param {string} payoutData.type - Payout type: "STARS" or "GIFT"
 * @param {string} payoutData.giftName - Gift name (for GIFT type): "HEART", "BEAR", etc.
 * @param {number} payoutData.quantity - Quantity of gifts/stars (1-100, default 1)
 * @returns {Promise<{id: number, username: string, type: string, giftName: string, total: number, starsAmount: number, quantity: number, status: string}>}
 */
export async function createPayout(payoutData) {
  const requestData = {
    username: payoutData.username,
    total: payoutData.total, // Already in bigint format
    starsAmount: payoutData.starsAmount,
    type: payoutData.type,
    giftName: payoutData.giftName,
    quantity: payoutData.quantity || 1 // Default to 1 if not provided
  }
  
  return authFetch("/api/payouts", {
    method: "POST",
    body: JSON.stringify(requestData)
  });
}

/**
 * Fetches the last 20 payout history entries for the current user.
 * @returns {Promise<Array<{amount: number, date: string, status: string}>>}
 * amount is in bigint format (will be converted to tickets on frontend)
 */
export async function fetchPayoutHistory() {
  return authFetch("/api/payouts/history", { method: "GET" });
}

/**
 * Creates a payment invoice for Telegram Stars payment.
 * @param {number} starsAmount - Amount in Stars
 * @returns {Promise<{invoiceId: string, starsAmount: number, ticketsAmount: number}>}
 */
export async function createPaymentInvoice(starsAmount) {
  return authFetch("/api/payments/create", {
    method: "POST",
    body: JSON.stringify({ starsAmount })
  });
}

/**
 * Cancels a payment.
 * @param {string} orderId - Order ID to cancel
 * @returns {Promise<void>}
 */
export async function cancelPayment(orderId) {
  return authFetch("/api/payments/cancel", {
    method: "POST",
    body: JSON.stringify({ orderId })
  });
}

// Export authFetch for use in other modules if needed
export { authFetch };

