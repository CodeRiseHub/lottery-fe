/**
 * Remote logger utility for sending frontend console logs to backend.
 * Useful for debugging on mobile devices where console logs are not accessible.
 */

// For production: use relative URLs (empty string) or set VITE_API_BASE_URL env var
// For development: defaults to localhost:8080
const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || (import.meta.env.PROD ? "" : "http://localhost:8080");
const ENABLE_REMOTE_LOGGING = false; // Disabled

let currentUserId = null;
let logQueue = [];
let isSending = false;
const MAX_QUEUE_SIZE = 100;

/**
 * Sets the current user ID for log context.
 */
export function setUserId(userId) {
  currentUserId = userId;
}

/**
 * Sends a log entry to the backend.
 */
async function sendLog(level, message, data = null) {
  if (!ENABLE_REMOTE_LOGGING) {
    return;
  }

  try {
    const logEntry = {
      level,
      message: String(message || '').substring(0, 1000), // Limit message length
      data: data ? JSON.stringify(data).substring(0, 2000) : null, // Limit data length
      userId: currentUserId,
      userAgent: navigator.userAgent,
      timestamp: new Date().toISOString()
    };

    // Add to queue
    logQueue.push(logEntry);

    // Limit queue size to prevent memory issues
    if (logQueue.length > MAX_QUEUE_SIZE) {
      logQueue.shift(); // Remove oldest entry
    }

    // Send logs in batches to avoid overwhelming the backend
    if (!isSending && logQueue.length > 0) {
      isSending = true;
      
      // Send in batches of 5
      const batch = logQueue.splice(0, 5);
      
      try {
        await Promise.all(
          batch.map(entry =>
            fetch(`${API_BASE_URL}/api/debug/log`, {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json'
              },
              body: JSON.stringify(entry),
              // Don't wait for response - fire and forget
              keepalive: true
            }).catch(() => {
              // Silently fail - don't break the app if logging fails
            })
          )
        );
      } catch (error) {
        // Silently fail
      } finally {
        isSending = false;
        
        // If there are more logs in queue, send them after a short delay
        if (logQueue.length > 0) {
          setTimeout(() => {
            if (!isSending && logQueue.length > 0) {
              // Recursively send remaining logs
              const nextBatch = logQueue.splice(0, 5);
              if (nextBatch.length > 0) {
                isSending = true;
                Promise.all(
                  nextBatch.map(entry =>
                    fetch(`${API_BASE_URL}/api/debug/log`, {
                      method: 'POST',
                      headers: { 'Content-Type': 'application/json' },
                      body: JSON.stringify(entry),
                      keepalive: true
                    }).catch(() => {})
                  )
                ).finally(() => {
                  isSending = false;
                });
              }
            }
          }, 200);
        }
      }
    }
  } catch (error) {
    // Silently fail - don't break the app
  }
}

/**
 * Intercepts console methods and sends logs to backend.
 */
export function initRemoteLogger() {
  if (!ENABLE_REMOTE_LOGGING) {
    return;
  }

  // Store original console methods
  const originalLog = console.log;
  const originalWarn = console.warn;
  const originalError = console.error;
  const originalDebug = console.debug;

  // Override console.log
  console.log = function(...args) {
    originalLog.apply(console, args);
    const message = args.map(arg => 
      typeof arg === 'object' ? JSON.stringify(arg) : String(arg)
    ).join(' ');
    sendLog('INFO', message, args.length > 1 ? args : null);
  };

  // Override console.warn
  console.warn = function(...args) {
    originalWarn.apply(console, args);
    const message = args.map(arg => 
      typeof arg === 'object' ? JSON.stringify(arg) : String(arg)
    ).join(' ');
    sendLog('WARN', message, args.length > 1 ? args : null);
  };

  // Override console.error
  console.error = function(...args) {
    originalError.apply(console, args);
    const message = args.map(arg => 
      typeof arg === 'object' ? JSON.stringify(arg) : String(arg)
    ).join(' ');
    sendLog('ERROR', message, args.length > 1 ? args : null);
  };

  // Override console.debug (optional, can be verbose)
  console.debug = function(...args) {
    originalDebug.apply(console, args);
    // Only send debug logs if explicitly enabled
    if (import.meta.env.VITE_ENABLE_DEBUG_LOGGING === "true") {
      const message = args.map(arg => 
        typeof arg === 'object' ? JSON.stringify(arg) : String(arg)
      ).join(' ');
      sendLog('DEBUG', message, args.length > 1 ? args : null);
    }
  };
}

