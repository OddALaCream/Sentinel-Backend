const ApiError = require('./apiError');

const isNoRowsError = (error) => error && error.code === 'PGRST116';

const isMissingColumnError = (error, columnName) => {
  if (!error || !columnName) {
    return false;
  }

  const normalizedColumnName = columnName.toLowerCase();
  const details = [error.message, error.details, error.hint]
    .filter(Boolean)
    .join(' ')
    .toLowerCase();

  return (
    details.includes(normalizedColumnName) &&
    (details.includes('column') || details.includes('schema cache'))
  );
};

const toApiError = (error, fallbackMessage = 'An error occurred while processing the request') => {
  if (!error) {
    return null;
  }

  if (error instanceof ApiError) {
    return error;
  }

  if (isNoRowsError(error)) {
    return ApiError.notFound(fallbackMessage);
  }

  if (error.code === '23505') {
    return ApiError.conflict(error.message || 'Resource already exists');
  }

  if (error.code === '23503') {
    return ApiError.badRequest(error.message || 'Related reference is invalid');
  }

  return ApiError.internal(error.message || fallbackMessage);
};

const throwSupabaseError = (error, fallbackMessage) => {
  if (error) {
    throw toApiError(error, fallbackMessage);
  }
};

const executeUpdateWithOptionalUpdatedAt = async (executeUpdate) => {
  const primaryResult = await executeUpdate({ includeUpdatedAt: true });

  if (!isMissingColumnError(primaryResult?.error, 'updated_at')) {
    return primaryResult;
  }

  return executeUpdate({ includeUpdatedAt: false });
};

module.exports = {
  isNoRowsError,
  isMissingColumnError,
  toApiError,
  throwSupabaseError,
  executeUpdateWithOptionalUpdatedAt
};
