const express = require("express");
const authMiddleware = require("../middleware/authMiddleware");
const {
  createRequest,
  getRequests,
  getRequestById,
  updateRequestStatus,
} = require("../controllers/requestController");

const router = express.Router();

/**
 * Middleware to restrict access based on user role from req.user.
 */
const requireRole = (...allowedRoles) => {
  return (req, res, next) => {
    if (!req.user || !allowedRoles.includes(req.user.role)) {
      return res.status(403).json({
        message: "Access denied. Insufficient role permissions.",
      });
    }
    next();
  };
};

// All request endpoints require valid JWT authentication
router.use(authMiddleware);

// POST /api/requests - STUDENT only
router.post("/", requireRole("STUDENT"), createRequest);

// GET /api/requests - Authenticated STUDENT, CLINIC, and ADMIN
router.get("/", requireRole("STUDENT", "CLINIC", "ADMIN"), getRequests);

// GET /api/requests/:id - Authenticated STUDENT (owner), CLINIC (owner), and ADMIN
router.get("/:id", requireRole("STUDENT", "CLINIC", "ADMIN"), getRequestById);

// PATCH /api/requests/:id/status - CLINIC only (ownership enforced in controller)
router.patch("/:id/status", requireRole("CLINIC"), updateRequestStatus);

module.exports = router;
