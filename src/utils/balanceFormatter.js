/**
 * Formats balance from bigint (6 decimal places) to display format (2 decimal places)
 * @param {number|string} balanceBigint - Balance stored as bigint (e.g., 1562785 = 1.562785)
 * @returns {string} Formatted balance with 2 decimal places (e.g., "1.56")
 */
export function formatBalance(balanceBigint) {
  if (!balanceBigint && balanceBigint !== 0) {
    return '0.00'
  }
  
  // Convert to number if string
  const balance = typeof balanceBigint === 'string' ? parseFloat(balanceBigint) : balanceBigint
  
  // Divide by 1,000,000 to get the actual value (6 decimal places)
  const actualValue = balance / 1000000
  
  // Format to 2 decimal places
  return actualValue.toFixed(2)
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



