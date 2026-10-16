export function notFound(req, res) {
  res.status(404).json({ success: false, message: `Route not found: ${req.method} ${req.originalUrl}` });
}

export function errorHandler(error, req, res, next) {
  if (res.headersSent) return next(error);
  console.error(error);
  if (error.code === "ER_DUP_ENTRY") {
    return res.status(409).json({ success: false, message: "A record with that unique value already exists." });
  }
  if (error.code === "ER_NO_REFERENCED_ROW_2") {
    return res.status(400).json({ success: false, message: "A referenced record does not exist." });
  }
  res.status(error.statusCode || 500).json({
    success: false,
    message: error.statusCode ? error.message : "Internal server error."
  });
}
