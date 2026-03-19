const multer = require('multer');
const ApiError = require('../utils/apiError');

const notFoundHandler = (req, res, next) => {
  next(ApiError.notFound(`Route ${req.method} ${req.originalUrl} not found`));
};

const errorHandler = (error, req, res, next) => {
  if (error instanceof multer.MulterError) {
    return res.status(400).json({
      success: false,
      message: error.message
    });
  }

  const statusCode = error.statusCode || 500;
  const message = error.message || 'Internal server error';

  if (statusCode >= 500) {
    console.error(error);
  }

  return res.status(statusCode).json({
    success: false,
    message,
    ...(error.details ? { details: error.details } : {})
  });
};

module.exports = {
  notFoundHandler,
  errorHandler
};
