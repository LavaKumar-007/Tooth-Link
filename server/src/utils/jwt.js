const jwt = require("jsonwebtoken");

/**
 * Retrieves JWT secret from environment variables.
 * Throws an error if JWT_SECRET is not defined to avoid hardcoded secrets.
 */
const getJwtSecret = () => {
  const secret = process.env.JWT_SECRET;
  if (!secret) {
    throw new Error("JWT_SECRET is not defined in environment variables");
  }
  return secret;
};

/**
 * Sign a JWT token with the provided payload.
 *
 * @param {Object} payload - Data to encode (e.g. { id, role, email })
 * @param {Object} [options] - JWT signing options
 * @returns {string} Signed JWT token
 */
const signToken = (payload, options = { expiresIn: "7d" }) => {
  const secret = getJwtSecret();
  return jwt.sign(payload, secret, options);
};

/**
 * Verify a JWT token.
 *
 * @param {string} token - The JWT token string to verify
 * @returns {Object} Decoded token payload
 */
const verifyToken = (token) => {
  const secret = getJwtSecret();
  return jwt.verify(token, secret);
};

module.exports = {
  signToken,
  generateToken: signToken,
  verifyToken,
  getJwtSecret,
};
