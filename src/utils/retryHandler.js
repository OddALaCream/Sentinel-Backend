/**
 * Retry handler for PostgREST schema cache errors
 * Implements exponential backoff for transient failures
 * Logs all retry attempts for debugging
 */

const ApiError = require('./apiError');

// PostgREST error codes that could be cache-related
const CACHE_ERROR_CODES = [
  'pgrst204',
  'pgrst205',
  'could not find column',
  'could not find relation',
  'schema cache'
];

const isPostgRESTPgError = (error) => {
  if (!error) return false;

  const errorStr = error.message || error.toString();
  return CACHE_ERROR_CODES.some(code =>
    errorStr.toLowerCase().includes(code.toLowerCase())
  );
};

/**
 * Retries an async operation with exponential backoff
 * @param {Function} operation - Async function to retry
 * @param {Object} options - Retry options
 * @param {number} options.maxRetries - Max retry attempts (default: 3)
 * @param {number} options.initialDelayMs - Initial delay in ms (default: 1000)
 * @param {Function} options.isRetryable - Function to determine if error is retryable (default: isPostgRESTPgError)
 * @param {string} options.operationName - Name of operation for logging
 * @returns {Promise} Result of the operation
 */
const executeWithRetry = async (operation, options = {}) => {
  const {
    maxRetries = 3,
    initialDelayMs = 1000,
    isRetryable = isPostgRESTPgError,
    operationName = 'Operation'
  } = options;

  let lastError;

  for (let attempt = 0; attempt < maxRetries; attempt++) {
    try {
      const result = await operation();
      if (attempt > 0) {
        console.log(
          `✅ [${operationName}] SUCCESS on retry ${attempt}/${maxRetries - 1}`
        );
      }
      return result;
    } catch (error) {
      lastError = error;

      // Check if error is retryable
      if (!isRetryable(error)) {
        // Not a transient error, throw immediately
        console.debug(
          `ℹ️ [${operationName}] Non-retryable error: ${error.message}`
        );
        throw error;
      }

      // Don't delay after last attempt
      if (attempt < maxRetries - 1) {
        const delayMs = initialDelayMs * Math.pow(2, attempt);
        console.warn(
          `⚠️ [${operationName}] PostgREST cache/transient error (attempt ${attempt + 1}/${maxRetries}): ${error.message}`
        );
        console.warn(
          `⏳ Retrying in ${delayMs}ms... (${maxRetries - attempt - 1} retries left)`
        );
        await new Promise(resolve => setTimeout(resolve, delayMs));
      } else {
        console.error(
          `❌ [${operationName}] Failed after ${maxRetries} attempts. Last error: ${error.message}`
        );
      }
    }
  }

  // All retries exhausted
  throw lastError;
};

/**
 * Wrapper for Supabase operations with automatic retry on cache errors
 * Usage: const result = await retrySupabaseOperation(() =>
 *   userClient.from('table').update(...).eq(...).select()
 * );
 */
const retrySupabaseOperation = async (operation, maxRetries = 3, operationName = 'Supabase Operation') => {
  return executeWithRetry(operation, {
    maxRetries,
    operationName,
    isRetryable: (error) => {
      if (!error) return false;

      // Check for PostgREST cache errors
      if (isPostgRESTPgError(error)) {
        console.error(`🔴 PostgREST Cache Error Detected: ${error.message}`);
        return true;
      }

      // Check for network-related errors (transient)
      if (error.code === 'NetworkError' || error.message?.includes('network')) {
        console.error(`🔴 Network Error Detected: ${error.message}`);
        return true;
      }

      return false;
    }
  });
};

module.exports = {
  executeWithRetry,
  retrySupabaseOperation,
  isPostgRESTPgError
};
