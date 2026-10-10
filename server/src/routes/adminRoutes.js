const express = require("express");
const authMiddleware = require("../middleware/authMiddleware");
const {
  getAdminStats,
  getPendingVerifications,
  getStudentVerifications,
  getClinicVerifications,
  updateStudentVerification,
  updateClinicVerification,
  getAllUsers,
} = require("../controllers/adminController");

const router = express.Router();

/**
 * Middleware to restrict access based on user role strictly derived from validated JWT.
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

// All admin endpoints require valid JWT authentication and verified ADMIN role
router.use(authMiddleware);
router.use(requireRole("ADMIN"));

// GET /api/admin/stats - Overview statistics
router.get("/stats", getAdminStats);

// GET /api/admin/verifications - Pending / filtered student and clinic verifications with counts
router.get("/verifications", getPendingVerifications);

// GET /api/admin/verifications/students - Student verifications list & counts
router.get("/verifications/students", getStudentVerifications);

// GET /api/admin/verifications/clinics - Clinic verifications list & counts
router.get("/verifications/clinics", getClinicVerifications);

// PATCH /api/admin/verifications/student/:id - Approve or reject student
router.patch("/verifications/student/:id", updateStudentVerification);

// PATCH /api/admin/verifications/clinic/:id - Approve or reject clinic
router.patch("/verifications/clinic/:id", updateClinicVerification);

// GET /api/admin/users - Platform users list
router.get("/users", getAllUsers);

module.exports = router;
