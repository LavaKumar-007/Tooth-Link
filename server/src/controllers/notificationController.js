const prisma = require("../utils/prisma");

/**
 * GET /api/notifications
 * Retrieves all notifications for the authenticated user.
 */
const getNotifications = async (req, res) => {
  try {
    const notifications = await prisma.notification.findMany({
      where: {
        userId: req.user.id,
      },
      orderBy: {
        createdAt: "desc",
      },
    });

    const unreadCount = notifications.filter((n) => !n.isRead).length;

    return res.status(200).json({
      unreadCount,
      count: notifications.length,
      notifications,
    });
  } catch (error) {
    console.error("Get notifications error:", error);
    return res.status(500).json({
      message: "Internal server error fetching notifications",
    });
  }
};

/**
 * PATCH /api/notifications/:id/read
 * Marks a notification as read. Only the notification owner may perform this action.
 */
const markAsRead = async (req, res) => {
  try {
    const notificationId = parseInt(req.params.id, 10);
    if (isNaN(notificationId)) {
      return res.status(400).json({
        message: "Invalid notification ID. ID must be a number.",
      });
    }

    const notification = await prisma.notification.findUnique({
      where: { id: notificationId },
    });

    if (!notification) {
      return res.status(404).json({
        message: "Notification not found",
      });
    }

    // Security check: Only the owner user may mark as read
    if (notification.userId !== req.user.id) {
      return res.status(403).json({
        message: "Access denied. You do not own this notification.",
      });
    }

    const updatedNotification = await prisma.notification.update({
      where: { id: notificationId },
      data: { isRead: true },
    });

    return res.status(200).json({
      message: "Notification marked as read",
      notification: updatedNotification,
    });
  } catch (error) {
    console.error("Mark notification as read error:", error);
    return res.status(500).json({
      message: "Internal server error updating notification",
    });
  }
};

module.exports = {
  getNotifications,
  markAsRead,
};
