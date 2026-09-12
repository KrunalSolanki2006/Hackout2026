/**
 * Global error handling middleware
 * Maps thrown errors to the API_CONTRACT error envelope
 */
function errorHandler(err, req, res, next) {
  console.error('[Error]', err);

  // Structured error thrown by services
  if (err.code && err.status) {
    return res.status(err.status).json({
      success: false,
      error: {
        code: err.code,
        message: err.message,
        ...(err.field ? { field: err.field } : {}),
      },
    });
  }

  // Mongoose validation error
  if (err.name === 'ValidationError') {
    const field = Object.keys(err.errors)[0];
    return res.status(400).json({
      success: false,
      error: {
        code: 'VALIDATION_ERROR',
        message: err.errors[field]?.message || err.message,
        field,
      },
    });
  }

  // Mongoose duplicate key
  if (err.code === 11000) {
    const field = Object.keys(err.keyPattern || {})[0];
    return res.status(409).json({
      success: false,
      error: {
        code: 'CONFLICT',
        message: `Duplicate value for ${field}`,
        field,
      },
    });
  }

  // Fallback
  return res.status(500).json({
    success: false,
    error: {
      code: 'INTERNAL_ERROR',
      message: process.env.NODE_ENV === 'development' ? err.message : 'An internal error occurred',
    },
  });
}

module.exports = { errorHandler };
