const TICKETS_HIDE_DECIMALS_THRESHOLD = 10000

/**
 * Formats a ticket amount for display: if >= 10000 tickets, show integer; otherwise 2 decimal places.
 * @param {number} tickets - Amount in tickets (e.g. 20567.25 or 9875.25)
 * @returns {string} e.g. "20567" or "9875.25"
 */
export function formatTicketsDisplay(tickets) {
  if (tickets == null || Number.isNaN(tickets)) {
    return '0.00'
  }
  const value = typeof tickets === 'string' ? parseFloat(tickets) : tickets
  if (value >= TICKETS_HIDE_DECIMALS_THRESHOLD) {
    return String(Math.floor(value))
  }
  return value.toFixed(2)
}

/**
 * Formats balance from bigint (6 decimal places) to display format.
 * If value >= 10000 tickets: no decimals (e.g. "20567").
 * Otherwise: 2 decimal places (e.g. "9875.25").
 * @param {number|string} balanceBigint - Balance stored as bigint (e.g., 1562785 = 1.562785)
 * @returns {string} Formatted balance
 */
export function formatBalance(balanceBigint) {
  if (!balanceBigint && balanceBigint !== 0) {
    return '0.00'
  }
  
  // Convert to number if string
  const balance = typeof balanceBigint === 'string' ? parseFloat(balanceBigint) : balanceBigint
  
  // Divide by 1,000,000 to get the actual value in tickets (6 decimal places)
  const actualValue = balance / 1000000
  
  return formatTicketsDisplay(actualValue)
}

/**
 * Converts display format back to bigint format
 * @param {number|string} displayValue - Display value (e.g., 1.5627)
 * @returns {number} Bigint value (e.g., 1562700)
 */
export function balanceToBigint(displayValue) {
  const value = typeof displayValue === 'string' ? parseFloat(displayValue) : displayValue
  return Math.round(value * 1000000)
}



