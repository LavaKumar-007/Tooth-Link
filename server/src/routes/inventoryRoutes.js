const express = require("express");
const authMiddleware = require("../middleware/authMiddleware");
const {
  createInventory,
  getInventories,
  getInventoryById,
  updateInventory,
  deleteInventory,
} = require("../controllers/inventoryController");

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

// All inventory endpoints require valid JWT authentication
router.use(authMiddleware);

// POST /api/inventory - CLINIC only
router.post("/", requireRole("CLINIC"), createInventory);

// GET /api/inventory - Authenticated STUDENT, CLINIC (and ADMIN)
router.get("/", requireRole("CLINIC", "STUDENT", "ADMIN"), getInventories);

// GET /api/inventory/:id - Authenticated STUDENT, CLINIC (and ADMIN)
router.get("/:id", requireRole("CLINIC", "STUDENT", "ADMIN"), getInventoryById);

// PUT /api/inventory/:id - CLINIC only (ownership enforced in controller)
router.put("/:id", requireRole("CLINIC"), updateInventory);

// DELETE /api/inventory/:id - CLINIC only (ownership enforced in controller)
router.delete("/:id", requireRole("CLINIC"), deleteInventory);

module.exports = router;
