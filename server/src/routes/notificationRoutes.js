const express = require("express");
const authMiddleware = require("../middleware/authMiddleware");
const {
  getNotifications,
  markAsRead,
} = require("../controllers/notificationController");

const router = express.Router();

// All notification endpoints require valid JWT authentication
router.use(authMiddleware);

// GET /api/notifications - Get authenticated user's notifications
router.get("/", getNotifications);

// PATCH /api/notifications/:id/read - Mark specific notification as read
router.patch("/:id/read", markAsRead);

module.exports = router;
