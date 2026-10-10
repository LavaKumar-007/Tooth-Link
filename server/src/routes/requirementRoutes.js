const express = require("express");
const authMiddleware = require("../middleware/authMiddleware");
const {
  createRequirement,
  getRequirements,
  getRequirementById,
  updateRequirement,
  deleteRequirement,
  getRequirementMatches,
  toggleRequirementNotify,
} = require("../controllers/requirementController");

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

// All requirement endpoints require valid JWT authentication
router.use(authMiddleware);

// POST /api/requirements - STUDENT only
router.post("/", requireRole("STUDENT"), createRequirement);

// GET /api/requirements - Authenticated STUDENT (and ADMIN)
router.get("/", requireRole("STUDENT", "ADMIN"), getRequirements);

// GET /api/requirements/:id/matches - Authenticated STUDENT (owner) and ADMIN
router.get("/:id/matches", requireRole("STUDENT", "ADMIN"), getRequirementMatches);

// GET /api/requirements/:id - Authenticated STUDENT (owner) and ADMIN
router.get("/:id", requireRole("STUDENT", "ADMIN"), getRequirementById);

// PATCH /api/requirements/:id/notify - STUDENT only (ownership enforced in controller)
router.patch("/:id/notify", requireRole("STUDENT"), toggleRequirementNotify);

// PUT /api/requirements/:id - STUDENT only (ownership enforced in controller)
router.put("/:id", requireRole("STUDENT"), updateRequirement);

// DELETE /api/requirements/:id - STUDENT only (ownership enforced in controller)
router.delete("/:id", requireRole("STUDENT"), deleteRequirement);

module.exports = router;
