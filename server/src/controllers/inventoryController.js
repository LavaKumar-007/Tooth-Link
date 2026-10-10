const notificationService = require("../services/notificationService");
const prisma = require("../utils/prisma");

const VALID_TOOTH_TYPES = ["INCISOR", "CANINE", "PREMOLAR", "MOLAR"];
const VALID_ARCH_TYPES = ["MAXILLARY", "MANDIBULAR", "BOTH"];
const VALID_INVENTORY_STATUSES = ["AVAILABLE", "UNAVAILABLE", "EXPIRED"];

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
 * POST /api/inventory
 * Creates a new inventory record for the authenticated clinic.
 * clinicId is derived strictly from the authenticated user's clinic profile.
 */
const createInventory = async (req, res) => {
  try {
    // 1. Fetch clinic profile for authenticated user
    const clinic = await prisma.clinic.findUnique({
      where: { userId: req.user.id },
    });

    if (!clinic) {
      return res.status(404).json({
        message: "Clinic profile not found for authenticated user",
      });
    }

    // Role-based rule: Pending or rejected clinics cannot publish inventory
    if (clinic.verificationStatus !== "APPROVED") {
      return res.status(403).json({
        message:
          "Access denied. Your clinic account must be verified and approved by an administrator before publishing inventory.",
      });
    }

    const {
      toothType,
      specificTooth,
      arch,
      condition,
      quantity,
      location,
      availableFrom,
      availableUntil,
      status,
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

    // 5. Validate status enum if provided
    if (status && !VALID_INVENTORY_STATUSES.includes(status)) {
      return res.status(400).json({
        message: `Invalid status '${status}'. Must be one of: ${VALID_INVENTORY_STATUSES.join(", ")}`,
      });
    }

    // 6. Validate quantity is a positive integer
    if (!isPositiveInteger(quantity)) {
      return res.status(400).json({
        message: "quantity must be a positive integer",
      });
    }

    // 7. Validate location
    if (typeof location !== "string" || !location.trim()) {
      return res.status(400).json({
        message: "location must be a non-empty string",
      });
    }

    // 8. Validate dates
    let parsedAvailableFrom = null;
    let parsedAvailableUntil = null;

    if (availableFrom) {
      parsedAvailableFrom = new Date(availableFrom);
      if (isNaN(parsedAvailableFrom.getTime())) {
        return res.status(400).json({
          message: "Invalid availableFrom date format",
        });
      }
    }

    if (availableUntil) {
      parsedAvailableUntil = new Date(availableUntil);
      if (isNaN(parsedAvailableUntil.getTime())) {
        return res.status(400).json({
          message: "Invalid availableUntil date format",
        });
      }
    }

    if (parsedAvailableFrom && parsedAvailableUntil && parsedAvailableUntil < parsedAvailableFrom) {
      return res.status(400).json({
        message: "availableUntil cannot be earlier than availableFrom",
      });
    }

    // 9. Create inventory record - clinicId NEVER accepted from request body
    const inventory = await prisma.inventory.create({
      data: {
        clinicId: clinic.id,
        toothType,
        specificTooth: specificTooth ? String(specificTooth).trim() : null,
        arch,
        condition: condition ? String(condition).trim() : null,
        quantity: Number(quantity),
        location: location.trim(),
        availableFrom: parsedAvailableFrom,
        availableUntil: parsedAvailableUntil,
        status: status || "AVAILABLE",
      },
      include: {
        clinic: {
          select: {
            id: true,
            clinicName: true,
            doctorName: true,
            location: true,
          },
        },
      },
    });

    // 10. Automatically notify students with waiting requirements and notifyEnabled = true
    try {
      await notificationService.notifyStudentsForNewInventory(inventory, clinic.clinicName);
    } catch (err) {
      console.error("Error in notifyStudentsForNewInventory:", err);
    }

    return res.status(201).json({
      message: "Inventory record created successfully",
      inventory,
    });
  } catch (error) {
    console.error("Create inventory error:", error);
    return res.status(500).json({
      message: "Internal server error creating inventory record",
    });
  }
};

/**
 * GET /api/inventory
 * Returns inventory records (non-expired by default) with associated clinic details.
 */
const getInventories = async (req, res) => {
  try {
    const { toothType, arch, mine } = req.query || {};

    const where = {};

    // Allow clinic to query only their own inventory records
    if (mine === "true" && req.user.role === "CLINIC") {
      const clinic = await prisma.clinic.findUnique({
        where: { userId: req.user.id },
      });
      if (clinic) {
        where.clinicId = clinic.id;
      }
    } else {
      // By default, return all non-expired records
      const now = new Date();
      where.status = {
        not: "EXPIRED",
      };
      where.OR = [
        { availableUntil: null },
        { availableUntil: { gte: now } },
      ];
    }

    // Optional toothType filter
    if (toothType && VALID_TOOTH_TYPES.includes(toothType)) {
      where.toothType = toothType;
    }

    // Optional arch filter
    if (arch && VALID_ARCH_TYPES.includes(arch)) {
      where.arch = arch;
    }

    const inventories = await prisma.inventory.findMany({
      where,
      include: {
        clinic: {
          select: {
            id: true,
            clinicName: true,
            doctorName: true,
            location: true,
          },
        },
      },
      orderBy: {
        createdAt: "desc",
      },
    });

    return res.status(200).json({
      count: inventories.length,
      inventories,
    });
  } catch (error) {
    console.error("Get inventories error:", error);
    return res.status(500).json({
      message: "Internal server error fetching inventory records",
    });
  }
};

/**
 * GET /api/inventory/:id
 * Returns a specific inventory record with associated clinic details.
 */
const getInventoryById = async (req, res) => {
  try {
    const inventoryId = parseInt(req.params.id, 10);
    if (isNaN(inventoryId)) {
      return res.status(400).json({
        message: "Invalid inventory ID. ID must be a number.",
      });
    }

    const inventory = await prisma.inventory.findUnique({
      where: { id: inventoryId },
      include: {
        clinic: {
          select: {
            id: true,
            clinicName: true,
            doctorName: true,
            location: true,
          },
        },
      },
    });

    if (!inventory) {
      return res.status(404).json({
        message: "Inventory record not found",
      });
    }

    return res.status(200).json({
      inventory,
    });
  } catch (error) {
    console.error("Get inventory by ID error:", error);
    return res.status(500).json({
      message: "Internal server error fetching inventory record",
    });
  }
};

/**
 * PUT /api/inventory/:id
 * Updates an inventory record owned by the authenticated clinic.
 */
const updateInventory = async (req, res) => {
  try {
    const inventoryId = parseInt(req.params.id, 10);
    if (isNaN(inventoryId)) {
      return res.status(400).json({
        message: "Invalid inventory ID. ID must be a number.",
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

    // 2. Fetch existing inventory record
    const existingInventory = await prisma.inventory.findUnique({
      where: { id: inventoryId },
    });

    if (!existingInventory) {
      return res.status(404).json({
        message: "Inventory record not found",
      });
    }

    // 3. Security: Enforce clinic ownership
    if (existingInventory.clinicId !== clinic.id) {
      return res.status(403).json({
        message: "Access denied. You do not own this inventory record.",
      });
    }

    const {
      toothType,
      specificTooth,
      arch,
      condition,
      quantity,
      location,
      availableFrom,
      availableUntil,
      status,
    } = req.body || {};

    const updateData = {};

    // 4. Validate fields if present in update payload
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

    if (status !== undefined) {
      if (!VALID_INVENTORY_STATUSES.includes(status)) {
        return res.status(400).json({
          message: `Invalid status '${status}'. Must be one of: ${VALID_INVENTORY_STATUSES.join(", ")}`,
        });
      }
      updateData.status = status;
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

    if (specificTooth !== undefined) {
      updateData.specificTooth = specificTooth ? String(specificTooth).trim() : null;
    }

    if (condition !== undefined) {
      updateData.condition = condition ? String(condition).trim() : null;
    }

    // 5. Date validation
    let targetAvailableFrom = existingInventory.availableFrom;
    let targetAvailableUntil = existingInventory.availableUntil;

    if (availableFrom !== undefined) {
      if (availableFrom === null || availableFrom === "") {
        targetAvailableFrom = null;
        updateData.availableFrom = null;
      } else {
        const parsedFrom = new Date(availableFrom);
        if (isNaN(parsedFrom.getTime())) {
          return res.status(400).json({
            message: "Invalid availableFrom date format",
          });
        }
        targetAvailableFrom = parsedFrom;
        updateData.availableFrom = parsedFrom;
      }
    }

    if (availableUntil !== undefined) {
      if (availableUntil === null || availableUntil === "") {
        targetAvailableUntil = null;
        updateData.availableUntil = null;
      } else {
        const parsedUntil = new Date(availableUntil);
        if (isNaN(parsedUntil.getTime())) {
          return res.status(400).json({
            message: "Invalid availableUntil date format",
          });
        }
        targetAvailableUntil = parsedUntil;
        updateData.availableUntil = parsedUntil;
      }
    }

    if (targetAvailableFrom && targetAvailableUntil && targetAvailableUntil < targetAvailableFrom) {
      return res.status(400).json({
        message: "availableUntil cannot be earlier than availableFrom",
      });
    }

    // 6. Update inventory (clinicId is NEVER changed)
    const updatedInventory = await prisma.inventory.update({
      where: { id: inventoryId },
      data: updateData,
      include: {
        clinic: {
          select: {
            id: true,
            clinicName: true,
            doctorName: true,
            location: true,
          },
        },
      },
    });

    return res.status(200).json({
      message: "Inventory record updated successfully",
      inventory: updatedInventory,
    });
  } catch (error) {
    console.error("Update inventory error:", error);
    return res.status(500).json({
      message: "Internal server error updating inventory record",
    });
  }
};

/**
 * DELETE /api/inventory/:id
 * Deletes an inventory record owned by the authenticated clinic.
 */
const deleteInventory = async (req, res) => {
  try {
    const inventoryId = parseInt(req.params.id, 10);
    if (isNaN(inventoryId)) {
      return res.status(400).json({
        message: "Invalid inventory ID. ID must be a number.",
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

    // 2. Fetch existing inventory record
    const existingInventory = await prisma.inventory.findUnique({
      where: { id: inventoryId },
    });

    if (!existingInventory) {
      return res.status(404).json({
        message: "Inventory record not found",
      });
    }

    // 3. Security: Enforce clinic ownership
    if (existingInventory.clinicId !== clinic.id) {
      return res.status(403).json({
        message: "Access denied. You do not own this inventory record.",
      });
    }

    // 4. Delete inventory record
    await prisma.inventory.delete({
      where: { id: inventoryId },
    });

    return res.status(200).json({
      message: "Inventory record deleted successfully",
    });
  } catch (error) {
    console.error("Delete inventory error:", error);
    return res.status(500).json({
      message: "Internal server error deleting inventory record",
    });
  }
};

module.exports = {
  createInventory,
  getInventories,
  getInventoryById,
  updateInventory,
  deleteInventory,
};
