const matchingService = require("../services/matchingService");
const notificationService = require("../services/notificationService");
const prisma = require("../utils/prisma");

const VALID_TOOTH_TYPES = ["INCISOR", "CANINE", "PREMOLAR", "MOLAR"];
const VALID_ARCH_TYPES = ["MAXILLARY", "MANDIBULAR", "BOTH"];
const VALID_REQUIREMENT_STATUSES = [
  "WAITING",
  "MATCH_FOUND",
  "REQUESTED",
  "FULFILLED",
  "CANCELLED",
];

/**
 * Helper to check whether a value is a positive integer.
 */
const isPositiveInteger = (val) => {
  if (typeof val === "boolean" || val === null || val === undefined) {
    return false;
  }
  const num = Number(val);
  return Number.isInteger(num) && num > 0;
};

/**
 * POST /api/requirements
 * Creates a new requirement for the authenticated student.
 * Automatically runs the matching service and updates status to MATCH_FOUND if matches exist.
 */
const createRequirement = async (req, res) => {
  try {
    // 1. Fetch student profile for authenticated user
    const student = await prisma.student.findUnique({
      where: { userId: req.user.id },
    });

    if (!student) {
      return res.status(404).json({
        message: "Student profile not found for authenticated user",
      });
    }

    const {
      toothType,
      specificTooth,
      arch,
      condition,
      quantity,
      location,
      requiredBy,
      notifyEnabled,
    } = req.body || {};

    // 2. Validate required fields
    if (!toothType || !arch || quantity === undefined || quantity === null || !location) {
      return res.status(400).json({
        message: "toothType, arch, quantity, and location are required fields",
      });
    }

    // 3. Validate toothType enum
    if (!VALID_TOOTH_TYPES.includes(toothType)) {
      return res.status(400).json({
        message: `Invalid toothType '${toothType}'. Must be one of: ${VALID_TOOTH_TYPES.join(", ")}`,
      });
    }

    // 4. Validate arch enum
    if (!VALID_ARCH_TYPES.includes(arch)) {
      return res.status(400).json({
        message: `Invalid arch '${arch}'. Must be one of: ${VALID_ARCH_TYPES.join(", ")}`,
      });
    }

    // 5. Validate quantity
    if (!isPositiveInteger(quantity)) {
      return res.status(400).json({
        message: "quantity must be a positive integer",
      });
    }

    // 6. Validate location
    if (typeof location !== "string" || !location.trim()) {
      return res.status(400).json({
        message: "location must be a non-empty string",
      });
    }

    // 7. Validate requiredBy date (cannot be in the past if supplied)
    let parsedRequiredBy = null;
    if (requiredBy) {
      parsedRequiredBy = new Date(requiredBy);
      if (isNaN(parsedRequiredBy.getTime())) {
        return res.status(400).json({
          message: "Invalid requiredBy date format",
        });
      }
      if (parsedRequiredBy < new Date()) {
        return res.status(400).json({
          message: "requiredBy cannot be in the past",
        });
      }
    }

    // 8. Save requirement with status WAITING - studentId derived strictly from authenticated student profile
    const requirement = await prisma.requirement.create({
      data: {
        studentId: student.id,
        toothType,
        specificTooth: specificTooth ? String(specificTooth).trim() : null,
        arch,
        condition: condition ? String(condition).trim() : null,
        quantity: Number(quantity),
        location: location.trim(),
        requiredBy: parsedRequiredBy,
        notifyEnabled: Boolean(notifyEnabled),
        status: "WAITING",
      },
      include: {
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

    // 9. Automatic match check: run matchingService immediately
    const matches = await matchingService.findMatchesForRequirement(requirement.id);

    let finalRequirement = requirement;
    if (matches && matches.length > 0) {
      finalRequirement = await prisma.requirement.update({
        where: { id: requirement.id },
        data: { status: "MATCH_FOUND" },
        include: {
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

      // If notifyEnabled is true, dispatch in-app notification, n8n webhook, and Brevo email
      if (finalRequirement.notifyEnabled) {
        const topMatch = matches[0];
        const notifMessage = `${topMatch.quantity} ${topMatch.arch.toLowerCase()} ${topMatch.toothType.toLowerCase()}s are available at ${topMatch.clinicName} in ${topMatch.location}.`;

        const studentName =
          finalRequirement.student?.user?.name || req.user.name || "Student";
        const studentEmail =
          finalRequirement.student?.user?.email || req.user.email || "";

        await notificationService.dispatchMatchNotifications({
          userId: student.userId,
          studentId: finalRequirement.studentId,
          requirementId: finalRequirement.id,
          inventoryId: topMatch.inventoryId,
          recipientEmail: studentEmail,
          recipientName: studentName,
          clinicName: topMatch.clinicName,
          toothType: topMatch.toothType,
          arch: topMatch.arch,
          quantity: topMatch.quantity,
          location: topMatch.location,
          message: notifMessage,
        });
      }
    }

    return res.status(201).json({
      message: "Requirement created successfully",
      requirement: finalRequirement,
      matchCount: matches.length,
      matches,
    });
  } catch (error) {
    console.error("Create requirement error:", error);
    return res.status(500).json({
      message: "Internal server error creating requirement",
    });
  }
};

/**
 * GET /api/requirements
 * Returns requirements belonging to the authenticated student.
 */
const getRequirements = async (req, res) => {
  try {
    const where = {};

    if (req.user.role === "STUDENT") {
      const student = await prisma.student.findUnique({
        where: { userId: req.user.id },
      });
      if (!student) {
        return res.status(404).json({
          message: "Student profile not found",
        });
      }
      where.studentId = student.id;
    } else if (req.user.role !== "ADMIN") {
      return res.status(403).json({
        message: "Access denied. Insufficient role permissions.",
      });
    }

    const requirements = await prisma.requirement.findMany({
      where,
      orderBy: {
        createdAt: "desc",
      },
    });

    return res.status(200).json({
      count: requirements.length,
      requirements,
    });
  } catch (error) {
    console.error("Get requirements error:", error);
    return res.status(500).json({
      message: "Internal server error fetching requirements",
    });
  }
};

/**
 * GET /api/requirements/:id
 * Returns a specific requirement if owned by the authenticated student.
 */
const getRequirementById = async (req, res) => {
  try {
    const reqId = parseInt(req.params.id, 10);
    if (isNaN(reqId)) {
      return res.status(400).json({
        message: "Invalid requirement ID. ID must be a number.",
      });
    }

    const requirement = await prisma.requirement.findUnique({
      where: { id: reqId },
      include: {
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

    if (!requirement) {
      return res.status(404).json({
        message: "Requirement not found",
      });
    }

    // Security: Only owner student or ADMIN can view
    if (req.user.role === "STUDENT") {
      const student = await prisma.student.findUnique({
        where: { userId: req.user.id },
      });
      if (!student || requirement.studentId !== student.id) {
        return res.status(403).json({
          message: "Access denied. You do not own this requirement.",
        });
      }
    } else if (req.user.role !== "ADMIN") {
      return res.status(403).json({
        message: "Access denied. Insufficient permissions.",
      });
    }

    return res.status(200).json({
      requirement,
    });
  } catch (error) {
    console.error("Get requirement by ID error:", error);
    return res.status(500).json({
      message: "Internal server error fetching requirement",
    });
  }
};

/**
 * PUT /api/requirements/:id
 * Updates a requirement owned by the authenticated student.
 */
const updateRequirement = async (req, res) => {
  try {
    const reqId = parseInt(req.params.id, 10);
    if (isNaN(reqId)) {
      return res.status(400).json({
        message: "Invalid requirement ID. ID must be a number.",
      });
    }

    // 1. Fetch student profile for authenticated user
    const student = await prisma.student.findUnique({
      where: { userId: req.user.id },
    });

    if (!student) {
      return res.status(404).json({
        message: "Student profile not found for authenticated user",
      });
    }

    // 2. Fetch existing requirement
    const existingRequirement = await prisma.requirement.findUnique({
      where: { id: reqId },
    });

    if (!existingRequirement) {
      return res.status(404).json({
        message: "Requirement not found",
      });
    }

    // 3. Security: Check ownership
    if (existingRequirement.studentId !== student.id) {
      return res.status(403).json({
        message: "Access denied. You do not own this requirement.",
      });
    }

    const {
      toothType,
      specificTooth,
      arch,
      condition,
      quantity,
      location,
      requiredBy,
      status,
      notifyEnabled,
    } = req.body || {};

    const updateData = {};

    // 4. Validate updated fields
    if (toothType !== undefined) {
      if (!VALID_TOOTH_TYPES.includes(toothType)) {
        return res.status(400).json({
          message: `Invalid toothType '${toothType}'. Must be one of: ${VALID_TOOTH_TYPES.join(", ")}`,
        });
      }
      updateData.toothType = toothType;
    }

    if (arch !== undefined) {
      if (!VALID_ARCH_TYPES.includes(arch)) {
        return res.status(400).json({
          message: `Invalid arch '${arch}'. Must be one of: ${VALID_ARCH_TYPES.join(", ")}`,
        });
      }
      updateData.arch = arch;
    }

    if (quantity !== undefined) {
      if (!isPositiveInteger(quantity)) {
        return res.status(400).json({
          message: "quantity must be a positive integer",
        });
      }
      updateData.quantity = Number(quantity);
    }

    if (location !== undefined) {
      if (typeof location !== "string" || !location.trim()) {
        return res.status(400).json({
          message: "location must be a non-empty string",
        });
      }
      updateData.location = location.trim();
    }

    if (status !== undefined) {
      if (!VALID_REQUIREMENT_STATUSES.includes(status)) {
        return res.status(400).json({
          message: `Invalid status '${status}'. Must be one of: ${VALID_REQUIREMENT_STATUSES.join(", ")}`,
        });
      }
      updateData.status = status;
    }

    if (requiredBy !== undefined) {
      if (requiredBy === null || requiredBy === "") {
        updateData.requiredBy = null;
      } else {
        const parsed = new Date(requiredBy);
        if (isNaN(parsed.getTime())) {
          return res.status(400).json({
            message: "Invalid requiredBy date format",
          });
        }
        if (parsed < new Date()) {
          return res.status(400).json({
            message: "requiredBy cannot be in the past",
          });
        }
        updateData.requiredBy = parsed;
      }
    }

    if (specificTooth !== undefined) {
      updateData.specificTooth = specificTooth ? String(specificTooth).trim() : null;
    }

    if (condition !== undefined) {
      updateData.condition = condition ? String(condition).trim() : null;
    }

    if (notifyEnabled !== undefined) {
      updateData.notifyEnabled = Boolean(notifyEnabled);
    }

    // 5. Update requirement (studentId is NEVER changed)
    const updatedRequirement = await prisma.requirement.update({
      where: { id: reqId },
      data: updateData,
      include: {
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

    // 6. If requirement is still active (WAITING or MATCH_FOUND) and status wasn't explicitly overridden, re-evaluate match status
    let finalRequirement = updatedRequirement;
    if (
      status === undefined &&
      (updatedRequirement.status === "WAITING" || updatedRequirement.status === "MATCH_FOUND")
    ) {
      const matches = await matchingService.findMatchesForRequirement(updatedRequirement.id);
      const newStatus = matches.length > 0 ? "MATCH_FOUND" : "WAITING";
      if (newStatus !== updatedRequirement.status) {
        finalRequirement = await prisma.requirement.update({
          where: { id: reqId },
          data: { status: newStatus },
          include: {
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
      }
    }

    return res.status(200).json({
      message: "Requirement updated successfully",
      requirement: finalRequirement,
    });
  } catch (error) {
    console.error("Update requirement error:", error);
    return res.status(500).json({
      message: "Internal server error updating requirement",
    });
  }
};

/**
 * DELETE /api/requirements/:id
 * Deletes a requirement owned by the authenticated student.
 */
const deleteRequirement = async (req, res) => {
  try {
    const reqId = parseInt(req.params.id, 10);
    if (isNaN(reqId)) {
      return res.status(400).json({
        message: "Invalid requirement ID. ID must be a number.",
      });
    }

    // 1. Fetch student profile for authenticated user
    const student = await prisma.student.findUnique({
      where: { userId: req.user.id },
    });

    if (!student) {
      return res.status(404).json({
        message: "Student profile not found for authenticated user",
      });
    }

    // 2. Fetch existing requirement
    const existingRequirement = await prisma.requirement.findUnique({
      where: { id: reqId },
    });

    if (!existingRequirement) {
      return res.status(404).json({
        message: "Requirement not found",
      });
    }

    // 3. Security: Check ownership
    if (existingRequirement.studentId !== student.id) {
      return res.status(403).json({
        message: "Access denied. You do not own this requirement.",
      });
    }

    // 4. Delete requirement
    await prisma.requirement.delete({
      where: { id: reqId },
    });

    return res.status(200).json({
      message: "Requirement deleted successfully",
    });
  } catch (error) {
    console.error("Delete requirement error:", error);
    return res.status(500).json({
      message: "Internal server error deleting requirement",
    });
  }
};

/**
 * GET /api/requirements/:id/matches
 * Retrieves matching inventory records for a requirement, sorted by highest match score.
 * Only the owner student or ADMIN may access.
 */
const getRequirementMatches = async (req, res) => {
  try {
    const reqId = parseInt(req.params.id, 10);
    if (isNaN(reqId)) {
      return res.status(400).json({
        message: "Invalid requirement ID. ID must be a number.",
      });
    }

    // 1. Fetch existing requirement
    const requirement = await prisma.requirement.findUnique({
      where: { id: reqId },
    });

    if (!requirement) {
      return res.status(404).json({
        message: "Requirement not found",
      });
    }

    // 2. Security: Check ownership (student must own requirement, or user must be ADMIN)
    if (req.user.role === "STUDENT") {
      const student = await prisma.student.findUnique({
        where: { userId: req.user.id },
      });
      if (!student || requirement.studentId !== student.id) {
        return res.status(403).json({
          message: "Access denied. You do not own this requirement.",
        });
      }
    } else if (req.user.role !== "ADMIN") {
      return res.status(403).json({
        message: "Access denied. Insufficient permissions.",
      });
    }

    // 3. Run matching service to find and rank matches
    const matches = await matchingService.findMatchesForRequirement(requirement.id);

    return res.status(200).json({
      requirementId: requirement.id,
      matchCount: matches.length,
      matches,
    });
  } catch (error) {
    console.error("Get requirement matches error:", error);
    return res.status(500).json({
      message: "Internal server error finding matches for requirement",
    });
  }
};

/**
 * PATCH /api/requirements/:id/notify
 * Toggles the notifyEnabled preference on a requirement.
 * Only the owner student may perform this action.
 */
const toggleRequirementNotify = async (req, res) => {
  try {
    const reqId = parseInt(req.params.id, 10);
    if (isNaN(reqId)) {
      return res.status(400).json({
        message: "Invalid requirement ID. ID must be a number.",
      });
    }

    const student = await prisma.student.findUnique({
      where: { userId: req.user.id },
    });

    if (!student) {
      return res.status(404).json({
        message: "Student profile not found",
      });
    }

    const requirement = await prisma.requirement.findUnique({
      where: { id: reqId },
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

    const { enabled } = req.body || {};
    if (typeof enabled !== "boolean") {
      return res.status(400).json({
        message: "enabled field is required and must be a boolean",
      });
    }

    const updatedRequirement = await prisma.requirement.update({
      where: { id: reqId },
      data: {
        notifyEnabled: enabled,
      },
      include: {
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

    return res.status(200).json({
      message: `Notify Me ${enabled ? "enabled" : "disabled"} successfully`,
      requirement: updatedRequirement,
    });
  } catch (error) {
    console.error("Toggle requirement notify error:", error);
    return res.status(500).json({
      message: "Internal server error updating notification preference",
    });
  }
};

module.exports = {
  createRequirement,
  getRequirements,
  getRequirementById,
  updateRequirement,
  deleteRequirement,
  getRequirementMatches,
  toggleRequirementNotify,
};
