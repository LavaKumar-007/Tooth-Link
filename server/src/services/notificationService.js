const matchingService = require("./matchingService");
const automationService = require("./automationService");
const emailService = require("./emailService");
const prisma = require("../utils/prisma");

/**
 * Creates an in-app notification record for a user.
 *
 * @param {Object} params
 * @param {number} params.userId - Target user ID
 * @param {number} [params.requirementId] - Optional requirement ID
 * @param {string} params.type - Notification category/type (e.g. 'MATCH_FOUND', 'NEW_REQUEST')
 * @param {string} params.title - Notification title
 * @param {string} params.message - Notification message body
 * @returns {Promise<Object>} Created notification
 */
const createNotification = async ({
  userId,
  requirementId = null,
  type,
  title,
  message,
}) => {
  return await prisma.notification.create({
    data: {
      userId,
      requirementId,
      type,
      title,
      message,
      isRead: false,
    },
  });
};

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const isValidEmail = (email) => {
  return typeof email === "string" && EMAIL_REGEX.test(email.trim());
};

/**
 * Dispatches all match notification channels:
 * 1. Creates an in-app Notification record in the database
 * 2. Triggers n8n webhook non-blockingly (if recipientEmail is valid)
 * 3. Sends Brevo transactional email non-blockingly (if configured and valid)
 *
 * Ensures failures in n8n or Brevo never rollback database operations or crash Express.
 *
 * @param {Object} params
 * @param {number} params.userId - User ID for in-app notification
 * @param {number} params.studentId - Student profile ID
 * @param {number} params.requirementId - Requirement ID
 * @param {number} params.inventoryId - Inventory ID
 * @param {string} params.recipientEmail - Student email
 * @param {string} params.recipientName - Student name
 * @param {string} params.clinicName - Clinic name
 * @param {string} params.toothType - Tooth type
 * @param {string} [params.arch] - Arch type (MAXILLARY, MANDIBULAR, BOTH)
 * @param {number} params.quantity - Quantity
 * @param {string} params.location - Location
 * @param {string} params.message - In-app notification message
 * @returns {Promise<Object>} Created in-app notification record
 */
const dispatchMatchNotifications = async ({
  userId,
  studentId,
  requirementId,
  inventoryId,
  recipientEmail,
  recipientName,
  clinicName,
  toothType,
  arch = null,
  quantity,
  location,
  message,
}) => {
  // 1. In-app notification (persisted in DB unconditionally)
  const notification = await createNotification({
    userId,
    requirementId,
    type: "MATCH_FOUND",
    title: "New Tooth Match Found",
    message,
  });

  const matchData = {
    studentId,
    requirementId,
    inventoryId,
    recipientEmail,
    recipientName,
    clinicName,
    toothType,
    arch,
    quantity,
    location,
    message,
  };

  // Only trigger outbound email channels if recipientEmail is valid
  if (isValidEmail(recipientEmail)) {
    // 2. Trigger n8n webhook (asynchronous & non-blocking)
    automationService.triggerMatchNotification(matchData).catch((err) => {
      console.error(
        `[automationService] Non-blocking dispatch error: ${err.message}`
      );
    });

    // 3. Trigger Brevo email directly if configured (asynchronous & non-blocking)
    emailService.sendMatchNotification(matchData).catch((err) => {
      console.error(
        `[emailService] Non-blocking dispatch error: ${err.message}`
      );
    });
  } else {
    console.warn(
      `[notificationService] Skipping email notification dispatch for requirement ${requirementId}: invalid or missing recipient email (${recipientEmail || "empty"}). In-app notification created.`
    );
  }

  return notification;
};

/**
 * Checks for waiting requirements when a new clinic inventory item is added.
 * For any matching requirement with notifyEnabled = true, updates status to MATCH_FOUND,
 * creates an in-app Notification for the student, and triggers n8n & Brevo automations.
 *
 * @param {Object} newInventory - Newly created inventory record
 * @param {string} clinicName - Name of the clinic
 */
const notifyStudentsForNewInventory = async (newInventory, clinicName) => {
  try {
    // Find active requirements with notifyEnabled = true
    const activeRequirements = await prisma.requirement.findMany({
      where: {
        notifyEnabled: true,
        status: { in: ["WAITING", "MATCH_FOUND"] },
        toothType: newInventory.toothType,
      },
      include: {
        student: {
          select: {
            id: true,
            userId: true,
            user: {
              select: {
                name: true,
                email: true,
              },
            },
          },
        },
      },
    });

    for (const req of activeRequirements) {
      const matches = await matchingService.findMatchesForRequirement(req.id);
      const isMatch = matches.some((m) => m.inventoryId === newInventory.id);

      if (isMatch) {
        if (req.status !== "MATCH_FOUND") {
          await prisma.requirement.update({
            where: { id: req.id },
            data: { status: "MATCH_FOUND" },
          });
        }

        const message = `${newInventory.quantity} ${newInventory.arch.toLowerCase()} ${newInventory.toothType.toLowerCase()}s are available at ${clinicName || "a clinic"} in ${newInventory.location}.`;

        const studentName = req.student?.user?.name || "Student";
        const studentEmail = req.student?.user?.email || "";

        await dispatchMatchNotifications({
          userId: req.student.userId,
          studentId: req.student.id,
          requirementId: req.id,
          inventoryId: newInventory.id,
          recipientEmail: studentEmail,
          recipientName: studentName,
          clinicName: clinicName || "Clinic",
          toothType: newInventory.toothType,
          arch: newInventory.arch,
          quantity: newInventory.quantity,
          location: newInventory.location,
          message,
        });
      }
    }
  } catch (err) {
    console.error("Error in notifyStudentsForNewInventory:", err);
  }
};

module.exports = {
  createNotification,
  dispatchMatchNotifications,
  notifyStudentsForNewInventory,
};
