/**
 * Retry handler for PostgREST schema cache errors
 * Implements exponential backoff for transient failures
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
 * @returns {Promise} Result of the operation
 */
const executeWithRetry = async (operation, options = {}) => {
  const {
    maxRetries = 3,
    initialDelayMs = 1000,
    isRetryable = isPostgRESTPgError
  } = options;

  let lastError;

  for (let attempt = 0; attempt < maxRetries; attempt++) {
    try {
      return await operation();
    } catch (error) {
      lastError = error;

      // Check if error is retryable
      if (!isRetryable(error)) {
        throw error;
      }

      // Don't delay after last attempt
      if (attempt < maxRetries - 1) {
        const delayMs = initialDelayMs * Math.pow(2, attempt);
        console.warn(
          `PostgREST cache error (attempt ${attempt + 1}/${maxRetries}), ` +
          `retrying in ${delayMs}ms...`,
          error.message
        );
        await new Promise(resolve => setTimeout(resolve, delayMs));
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
const retrySupabaseOperation = async (operation, maxRetries = 3) => {
  return executeWithRetry(operation, {
    maxRetries,
    isRetryable: (error) => {
      if (!error) return false;

      // Check for PostgREST cache errors
      if (isPostgRESTPgError(error)) {
        return true;
      }

      // Check for network-related errors (transient)
      if (error.code === 'NetworkError' || error.message?.includes('network')) {
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
