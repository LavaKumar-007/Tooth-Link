const matchingService = require("../services/matchingService");
const notificationService = require("../services/notificationService");
const prisma = require("../utils/prisma");

const isPositiveInteger = (val) => {
  if (typeof val === "boolean" || val === null || val === undefined) {
    return false;
  }
  const num = Number(val);
  return Number.isInteger(num) && num > 0;
};

/**
 * POST /api/requests
 * Creates a new tooth request from a student to a clinic.
 *
 * Security & Validation:
 * - Only authenticated STUDENT
 * - studentId derived strictly from req.user
 * - Requirement must belong to authenticated student
 * - Inventory must exist and be AVAILABLE
 * - Quantity must be positive integer and <= available quantity
 * - Inventory must match the requirement according to matching rules
 * - Prevents duplicate active (PENDING/ACCEPTED) requests for the same requirement/inventory
 */
const createRequest = async (req, res) => {
  try {
    // 1. Fetch authenticated student profile
    const student = await prisma.student.findUnique({
      where: { userId: req.user.id },
    });

    if (!student) {
      return res.status(404).json({
        message: "Student profile not found",
      });
    }

    // Role-based rule: Pending students may browse inventory and create requirements,
    // but cannot submit requests until approved.
    if (student.verificationStatus !== "APPROVED") {
      return res.status(403).json({
        message:
          "Access denied. Your student account must be verified and approved by an administrator before you can submit resource requests.",
      });
    }

    const { requirementId, inventoryId, quantity } = req.body || {};

    // 2. Validate input fields
    if (!requirementId || !inventoryId || quantity === undefined) {
      return res.status(400).json({
        message: "requirementId, inventoryId, and quantity are required fields",
      });
    }

    const parsedReqId = parseInt(requirementId, 10);
    const parsedInvId = parseInt(inventoryId, 10);

    if (isNaN(parsedReqId) || isNaN(parsedInvId)) {
      return res.status(400).json({
        message: "requirementId and inventoryId must be valid integers",
      });
    }

    if (!isPositiveInteger(quantity)) {
      return res.status(400).json({
        message: "quantity must be a positive integer",
      });
    }

    const requestedQty = Number(quantity);

    // 3. Verify requirement exists and belongs to student
    const requirement = await prisma.requirement.findUnique({
      where: { id: parsedReqId },
    });

    if (!requirement) {
      return res.status(404).json({
        message: "Requirement not found",
      });
    }

    if (requirement.studentId !== student.id) {
      return res.status(403).json({
        message: "Access denied. You do not own this requirement.",
      });
    }

    // 4. Verify inventory exists
    const inventory = await prisma.inventory.findUnique({
      where: { id: parsedInvId },
      include: {
        clinic: {
          select: {
            id: true,
            userId: true,
            clinicName: true,
            location: true,
          },
        },
      },
    });

    if (!inventory) {
      return res.status(404).json({
        message: "Inventory item not found",
      });
    }

    // 5. Verify inventory status
    if (inventory.status !== "AVAILABLE") {
      return res.status(400).json({
        message: "Selected inventory item is not currently available",
      });
    }

    // 6. Verify quantity availability
    if (requestedQty > inventory.quantity) {
      return res.status(400).json({
        message: `Requested quantity (${requestedQty}) exceeds available inventory quantity (${inventory.quantity})`,
      });
    }

    // 7. Verify match compatibility using rule-based matching
    const matches = await matchingService.findMatchesForRequirement(requirement.id);
    const isMatched = matches.some((m) => m.inventoryId === inventory.id);

    if (!isMatched) {
      return res.status(400).json({
        message: "Selected inventory does not meet requirement specifications",
      });
    }

    // 8. Prevent duplicate active requests
    const existingActiveRequest = await prisma.request.findFirst({
      where: {
        requirementId: requirement.id,
        inventoryId: inventory.id,
        status: { in: ["PENDING", "ACCEPTED"] },
      },
    });

    if (existingActiveRequest) {
      return res.status(409).json({
        message: "An active request already exists for this requirement and inventory combination",
      });
    }

    // 9. Create Request record with PENDING status
    const newRequest = await prisma.request.create({
      data: {
        requirementId: requirement.id,
        studentId: student.id,
        clinicId: inventory.clinicId,
        inventoryId: inventory.id,
        quantity: requestedQty,
        status: "PENDING",
        requestedAt: new Date(),
      },
      include: {
        requirement: true,
        inventory: true,
        clinic: {
          select: {
            id: true,
            clinicName: true,
            doctorName: true,
            location: true,
          },
        },
        student: {
          select: {
            id: true,
            institution: true,
            studentId: true,
            location: true,
          },
        },
      },
    });

    // 10. Update requirement status to REQUESTED
    if (requirement.status === "WAITING" || requirement.status === "MATCH_FOUND") {
      await prisma.requirement.update({
        where: { id: requirement.id },
        data: { status: "REQUESTED" },
      });
    }

    // 11. Notify clinic user of the new request
    await notificationService.createNotification({
      userId: inventory.clinic.userId,
      requirementId: requirement.id,
      type: "NEW_REQUEST",
      title: "New Tooth Request Received",
      message: `A dental student requested ${requestedQty} teeth from your inventory at ${inventory.clinic.clinicName}.`,
    });

    return res.status(201).json({
      message: "Request created successfully",
      request: newRequest,
    });
  } catch (error) {
    console.error("Create request error:", error);
    return res.status(500).json({
      message: "Internal server error creating request",
    });
  }
};

/**
 * GET /api/requests
 * Returns requests for the authenticated user (Student sees own, Clinic sees requests for their inventory).
 */
const getRequests = async (req, res) => {
  try {
    const where = {};

    if (req.user.role === "STUDENT") {
      const student = await prisma.student.findUnique({
        where: { userId: req.user.id },
      });
      if (!student) {
        return res.status(404).json({ message: "Student profile not found" });
      }
      where.studentId = student.id;
    } else if (req.user.role === "CLINIC") {
      const clinic = await prisma.clinic.findUnique({
        where: { userId: req.user.id },
      });
      if (!clinic) {
        return res.status(404).json({ message: "Clinic profile not found" });
      }
      where.clinicId = clinic.id;
    } else if (req.user.role !== "ADMIN") {
      return res.status(403).json({
        message: "Access denied. Insufficient role permissions.",
      });
    }

    const requests = await prisma.request.findMany({
      where,
      include: {
        requirement: true,
        inventory: true,
        clinic: {
          select: {
            id: true,
            clinicName: true,
            doctorName: true,
            location: true,
          },
        },
        student: {
          select: {
            id: true,
            institution: true,
            studentId: true,
            location: true,
            user: {
              select: {
                name: true,
                email: true,
              },
            },
          },
        },
      },
      orderBy: {
        requestedAt: "desc",
      },
    });

    return res.status(200).json({
      count: requests.length,
      requests,
    });
  } catch (error) {
    console.error("Get requests error:", error);
    return res.status(500).json({
      message: "Internal server error fetching requests",
    });
  }
};

/**
 * GET /api/requests/:id
 * Returns a specific request if authorized (owner student, owner clinic, or admin).
 */
const getRequestById = async (req, res) => {
  try {
    const requestId = parseInt(req.params.id, 10);
    if (isNaN(requestId)) {
      return res.status(400).json({
        message: "Invalid request ID. ID must be a number.",
      });
    }

    const requestItem = await prisma.request.findUnique({
      where: { id: requestId },
      include: {
        requirement: true,
        inventory: true,
        clinic: {
          select: {
            id: true,
            clinicName: true,
            doctorName: true,
            location: true,
          },
        },
        student: {
          select: {
            id: true,
            institution: true,
            studentId: true,
            location: true,
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

    if (!requestItem) {
      return res.status(404).json({
        message: "Request not found",
      });
    }

    // Security check: Student owner, Clinic owner, or Admin
    if (req.user.role === "STUDENT") {
      const student = await prisma.student.findUnique({
        where: { userId: req.user.id },
      });
      if (!student || requestItem.studentId !== student.id) {
        return res.status(403).json({
          message: "Access denied. You do not own this request.",
        });
      }
    } else if (req.user.role === "CLINIC") {
      const clinic = await prisma.clinic.findUnique({
        where: { userId: req.user.id },
      });
      if (!clinic || requestItem.clinicId !== clinic.id) {
        return res.status(403).json({
          message: "Access denied. You do not own the inventory for this request.",
        });
      }
    } else if (req.user.role !== "ADMIN") {
      return res.status(403).json({
        message: "Access denied. Insufficient permissions.",
      });
    }

    return res.status(200).json({
      request: requestItem,
    });
  } catch (error) {
    console.error("Get request by ID error:", error);
    return res.status(500).json({
      message: "Internal server error fetching request",
    });
  }
};

/**
 * PATCH /api/requests/:id/status
 * Updates request status. Only the clinic that owns the inventory may update status.
 *
 * Allowed clinic transitions:
 * - PENDING → ACCEPTED
 * - PENDING → REJECTED
 * - ACCEPTED → FULFILLED
 */
const updateRequestStatus = async (req, res) => {
  try {
    const requestId = parseInt(req.params.id, 10);
    if (isNaN(requestId)) {
      return res.status(400).json({
        message: "Invalid request ID. ID must be a number.",
      });
    }

    // 1. Fetch clinic profile for authenticated user
    const clinic = await prisma.clinic.findUnique({
      where: { userId: req.user.id },
    });

    if (!clinic) {
      return res.status(404).json({
        message: "Clinic profile not found for authenticated user",
      });
    }

    // 2. Fetch target request
    const existingRequest = await prisma.request.findUnique({
      where: { id: requestId },
      include: {
        student: {
          select: {
            id: true,
            userId: true,
          },
        },
        clinic: {
          select: {
            id: true,
            clinicName: true,
          },
        },
        inventory: true,
        requirement: true,
      },
    });

    if (!existingRequest) {
      return res.status(404).json({
        message: "Request not found",
      });
    }

    // 3. Security: Only owning clinic may modify status
    if (existingRequest.clinicId !== clinic.id) {
      return res.status(403).json({
        message: "Access denied. You do not own the inventory for this request.",
      });
    }

    const { status } = req.body || {};

    if (!status) {
      return res.status(400).json({
        message: "status field is required",
      });
    }

    const VALID_STATUSES = ["ACCEPTED", "REJECTED", "FULFILLED", "CANCELLED"];
    if (!VALID_STATUSES.includes(status)) {
      return res.status(400).json({
        message: `Invalid status '${status}'. Must be one of: ${VALID_STATUSES.join(", ")}`,
      });
    }

    // Role-based rule: Pending or rejected clinics cannot accept requests.
    if (status === "ACCEPTED" && clinic.verificationStatus !== "APPROVED") {
      return res.status(403).json({
        message:
          "Access denied. Your clinic account must be verified and approved by an administrator before accepting requests.",
      });
    }

    // 4. Validate allowed state transitions
    if (existingRequest.status === "PENDING") {
      if (!["ACCEPTED", "REJECTED"].includes(status)) {
        return res.status(400).json({
          message: "From PENDING, request can only transition to ACCEPTED or REJECTED",
        });
      }
    } else if (existingRequest.status === "ACCEPTED") {
      if (!["FULFILLED", "CANCELLED"].includes(status)) {
        return res.status(400).json({
          message: "From ACCEPTED, request can only transition to FULFILLED or CANCELLED",
        });
      }
    } else {
      return res.status(400).json({
        message: `Cannot change status of a request that is already ${existingRequest.status}`,
      });
    }

    const updateData = { status };

    if (status === "ACCEPTED" || status === "REJECTED") {
      updateData.respondedAt = new Date();
    } else if (status === "FULFILLED") {
      updateData.fulfilledAt = new Date();
    }

    // 5. Update request record
    const updatedRequest = await prisma.request.update({
      where: { id: requestId },
      data: updateData,
      include: {
        requirement: true,
        inventory: true,
        clinic: {
          select: {
            id: true,
            clinicName: true,
            doctorName: true,
            location: true,
          },
        },
        student: {
          select: {
            id: true,
            institution: true,
            studentId: true,
            location: true,
          },
        },
      },
    });

    // 6. Handle side effects for FULFILLED
    if (status === "FULFILLED") {
      // Deduct inventory quantity
      const newInventoryQty = Math.max(0, existingRequest.inventory.quantity - existingRequest.quantity);
      await prisma.inventory.update({
        where: { id: existingRequest.inventoryId },
        data: {
          quantity: newInventoryQty,
          status: newInventoryQty === 0 ? "UNAVAILABLE" : existingRequest.inventory.status,
        },
      });

      // Update requirement status to FULFILLED
      await prisma.requirement.update({
        where: { id: existingRequest.requirementId },
        data: { status: "FULFILLED" },
      });
    }

    // 7. Create notification for student
    let notifTitle = "";
    let notifMessage = "";

    if (status === "ACCEPTED") {
      notifTitle = "Tooth Request Accepted";
      notifMessage = `Your request for ${existingRequest.quantity} teeth has been accepted by ${existingRequest.clinic.clinicName}.`;
    } else if (status === "REJECTED") {
      notifTitle = "Tooth Request Declined";
      notifMessage = `Your request for teeth was declined by ${existingRequest.clinic.clinicName}.`;
    } else if (status === "FULFILLED") {
      notifTitle = "Tooth Request Fulfilled";
      notifMessage = `Your request with ${existingRequest.clinic.clinicName} has been marked as fulfilled.`;
    }

    if (notifTitle) {
      await notificationService.createNotification({
        userId: existingRequest.student.userId,
        requirementId: existingRequest.requirementId,
        type: `REQUEST_${status}`,
        title: notifTitle,
        message: notifMessage,
      });
    }

    return res.status(200).json({
      message: `Request status updated to ${status}`,
      request: updatedRequest,
    });
  } catch (error) {
    console.error("Update request status error:", error);
    return res.status(500).json({
      message: "Internal server error updating request status",
    });
  }
};

module.exports = {
  createRequest,
  getRequests,
  getRequestById,
  updateRequestStatus,
};
