/**
 * @desc    Handle 404 - Not Found
 */
export const notFound = (req, res, next) => {
  const error = new Error(`Not Found - ${req.originalUrl}`);
  res.status(404);
  next(error);
};

/**
 * @desc    Global error handler
 */
export const errorHandler = (err, req, res, next) => {
  // Set status code (default to 500 if not set)
  const statusCode = res.statusCode === 200 ? 500 : res.statusCode;
  res.status(statusCode);

  // Send error response
  res.json({
    message: err.message,
    // Only provide stack trace in development
    stack: process.env.NODE_ENV === "production" ? "🥞" : err.stack,
  });
};
