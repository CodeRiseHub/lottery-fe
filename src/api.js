// src/api.js
import { getSessionToken, clearSessionToken, storeSessionToken } from "./auth/sessionManager";
import { bootstrapSession } from "./auth/authService";

// For production: use relative URLs (empty string) or set VITE_API_BASE_URL env var
// For development: defaults to localhost:8080
const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || (import.meta.env.PROD ? "" : "http://localhost:8080");

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
 * Gets daily bonus status for the current user.
 * @returns {Promise<{taskId: number, available: boolean, cooldownSeconds: number|null, rewardAmount: number}>}
 */
export async function getDailyBonusStatus() {
  return authFetch("/api/tasks/daily-bonus", {
    method: "GET"
  });
}

/**
 * Fetches the 50 most recent daily bonus claims.
 * @returns {Promise<Array<{avatarUrl: string|null, screenName: string, claimedAt: string}>>}
 */
export async function getRecentDailyBonusClaims() {
  // Get user's timezone from browser (same as transaction history)
  const timezone = Intl.DateTimeFormat().resolvedOptions().timeZone;
  return authFetch(`/api/tasks/daily-bonus/recent-claims?timezone=${encodeURIComponent(timezone)}`, {
    method: "GET"
  });
}

/**
 * Fetches WIN transactions for the current user from the last 30 days with pagination.
 * @param {number} page - Page number (0-indexed, default 0)
 * @returns {Promise<{content: Array<{amount: number, date: string}>, number: number, totalPages: number, totalElements: number}>}
 */
export async function fetchGameHistory(page = 0) {
  // Get user's timezone from browser
  const timezone = Intl.DateTimeFormat().resolvedOptions().timeZone;
  return authFetch(`/api/game/history?page=${page}&timezone=${encodeURIComponent(timezone)}`, { method: "GET" });
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
  // Get user's timezone from browser
  const timezone = Intl.DateTimeFormat().resolvedOptions().timeZone;
  return authFetch(`/api/payouts/history?timezone=${encodeURIComponent(timezone)}`, { method: "GET" });
}

/**
 * Creates a payment invoice (crypto: usdAmount as decimal, e.g. 3.25).
 * @param {number} starsAmountOrUsd - USD amount (crypto), e.g. 3.25
 * @param {boolean} [useUsd=true] - If true, value is USD and sent as usdAmount (number)
 * @returns {Promise<{invoiceId: string, invoiceUrl?: string, starsAmount?: number, usdAmount?: number, ticketsAmount: number}>}
 */
export async function createPaymentInvoice(starsAmountOrUsd, useUsd = true) {
  const body = useUsd
    ? { usdAmount: starsAmountOrUsd }
    : { starsAmount: starsAmountOrUsd };
  return authFetch("/api/payments/create", {
    method: "POST",
    body: JSON.stringify(body)
  });
}

/**
 * Fetches minimum deposit from DB only (no external sync). Use on Store screen for validation.
 * @returns {Promise<{ minimumDeposit: number }>}
 */
export async function fetchMinimumDeposit() {
  return authFetch("/api/payments/minimum-deposit", { method: "GET" });
}

/**
 * Fetches crypto deposit methods (syncs from external API, saves to DB, returns methods + minimum deposit).
 * Call when Payment Options screen opens.
 * @returns {Promise<{ minimumDeposit: number, activeMethods: Array<{ pid: number, name: string, network: string, example?: string, minDepositSum: number }> }>}
 */
export async function fetchDepositMethods() {
  return authFetch("/api/payments/deposit-methods", { method: "GET" });
}

/**
 * Fetches crypto withdrawal methods from DB (synced every 30 min by backend cron).
 * Call when Payout screen opens.
 * @returns {Promise<{ methods: Array<{ pid: number, name: string, network: string, wayId: number, minWithdrawal: number }> }>}
 */
export async function fetchWithdrawalMethods() {
  return authFetch("/api/payments/withdrawal-methods", { method: "GET" });
}

/**
 * Fetches withdrawal method details (rateUsd, totalFeeUsd) from external API for the given way_id.
 * Call when Payout Confirmation screen opens to show network fee and compute "You will receive".
 * @param {number} wayId - way_id of the selected payout method
 * @returns {Promise<{ wayId: number, name: string, ticker: string, rateUsd: number, totalFeeUsd: number }|null>}
 */
export async function fetchWithdrawalMethodDetails(wayId) {
  const data = await authFetch(`/api/payments/withdrawal-method-details?wayId=${encodeURIComponent(wayId)}`, { method: "GET" });
  return data || null;
}

/**
 * Requests a crypto deposit address from the API (no payment record is created).
 * Call when user selects a payment method on Payment Options screen.
 * @param {number} pid - Deposit method PID from deposit-methods
 * @param {number} usdAmount - USD as decimal, e.g. 3.25
 * @returns {Promise<{ address: string, amountCoins: string, name: string, network: string, psId: number, minAmount?: number }>}
 */
export async function requestDepositAddress(pid, usdAmount) {
  return authFetch("/api/payments/deposit-address", {
    method: "POST",
    body: JSON.stringify({ pid, usdAmount })
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

/**
 * Fetches transaction history for the current user.
 * @param {number} page - Page number (0-indexed, defaults to 0)
 * @returns {Promise<{content: Array<{amount: number, date: string, type: string, taskId: number|null, roundId: number|null}>, totalPages: number, totalElements: number, number: number}>}
 */
export async function fetchTransactions(page = 0) {
  // Get user's timezone from browser
  const timezone = Intl.DateTimeFormat().resolvedOptions().timeZone;
  return authFetch(`/api/transactions?page=${page}&timezone=${encodeURIComponent(timezone)}`, { method: "GET" });
}

/**
 * Updates user's language preference.
 * @param {string} languageCode - Language code (EN, RU, DE, IT, NL, PL, FR, ES, ID, TR)
 * @returns {Promise<void>}
 */
export async function updateLanguage(languageCode) {
  return authFetch("/api/users/language", {
    method: "PUT",
    body: JSON.stringify({ languageCode })
  });
}

/**
 * Creates a new support ticket with the first message.
 * @param {string} subject - Ticket subject (5-100 characters)
 * @param {string} message - First message (3-2000 characters)
 * @returns {Promise<{id: number, subject: string, status: string, createdAt: string, updatedAt: string, messageCount: number}>}
 */
export async function createSupportTicket(subject, message) {
  return authFetch("/api/support/tickets", {
    method: "POST",
    body: JSON.stringify({ subject, message })
  });
}

/**
 * Fetches ticket history for the current user (last 20 tickets).
 * @returns {Promise<Array<{id: number, subject: string, status: string, createdAt: string, updatedAt: string, messageCount: number}>>}
 */
export async function fetchTicketHistory() {
  return authFetch("/api/support/tickets", { method: "GET" });
}

/**
 * Fetches ticket details with all messages.
 * @param {number} ticketId - Ticket ID
 * @returns {Promise<{id: number, subject: string, status: string, createdAt: string, updatedAt: string, messages: Array<{id: number, ticketId: number, userId: number, message: string, createdAt: string, isFromSupport: boolean}>}>}
 */
export async function fetchTicketDetail(ticketId) {
  return authFetch(`/api/support/tickets/${ticketId}`, { method: "GET" });
}

/**
 * Adds a message to an existing ticket.
 * @param {number} ticketId - Ticket ID
 * @param {string} message - Message text (3-2000 characters)
 * @returns {Promise<{id: number, ticketId: number, userId: number, message: string, createdAt: string, isFromSupport: boolean}>}
 */
export async function addTicketMessage(ticketId, message) {
  return authFetch(`/api/support/tickets/${ticketId}/messages`, {
    method: "POST",
    body: JSON.stringify({ message })
  });
}

/**
 * Closes a ticket.
 * @param {number} ticketId - Ticket ID
 * @returns {Promise<void>}
 */
export async function closeTicket(ticketId) {
  return authFetch(`/api/support/tickets/${ticketId}/close`, {
    method: "POST"
  });
}

// Export authFetch for use in other modules if needed
export { authFetch };

