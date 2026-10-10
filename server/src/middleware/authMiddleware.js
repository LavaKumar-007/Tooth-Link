const { verifyToken } = require("../utils/jwt");

/**
 * Middleware to authenticate requests using JWT Bearer token.
 * Reads token from the Authorization header: `Bearer <token>`
 * Verifies JWT and attaches decoded token payload to `req.user`.
 * Returns 401 if token is missing, invalid, or expired.
 */
const authMiddleware = (req, res, next) => {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return res.status(401).json({
      message: "Access denied. Missing or malformed authorization header.",
    });
  }

  const token = authHeader.split(" ")[1];

  if (!token) {
    return res.status(401).json({
      message: "Access denied. Missing token.",
    });
  }

  try {
    const decoded = verifyToken(token);
    req.user = decoded;
    next();
  } catch (error) {
    return res.status(401).json({
      message: "Access denied. Invalid or expired token.",
    });
  }
};

module.exports = authMiddleware;
module.exports.authMiddleware = authMiddleware;
