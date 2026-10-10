const notificationService = require("../services/notificationService");
const prisma = require("../utils/prisma");

/**
 * Helper to compute status counts for student and clinic verification records.
 */
const getVerificationCounts = async () => {
  const [
    pendingStudents,
    approvedStudents,
    rejectedStudents,
    pendingClinics,
    approvedClinics,
    rejectedClinics,
  ] = await Promise.all([
    prisma.student.count({ where: { verificationStatus: "PENDING" } }),
    prisma.student.count({ where: { verificationStatus: "APPROVED" } }),
    prisma.student.count({ where: { verificationStatus: "REJECTED" } }),
    prisma.clinic.count({ where: { verificationStatus: "PENDING" } }),
    prisma.clinic.count({ where: { verificationStatus: "APPROVED" } }),
    prisma.clinic.count({ where: { verificationStatus: "REJECTED" } }),
  ]);

  return {
    students: {
      pending: pendingStudents,
      approved: approvedStudents,
      rejected: rejectedStudents,
      total: pendingStudents + approvedStudents + rejectedStudents,
    },
    clinics: {
      pending: pendingClinics,
      approved: approvedClinics,
      rejected: rejectedClinics,
      total: pendingClinics + approvedClinics + rejectedClinics,
    },
    totalPending: pendingStudents + pendingClinics,
  };
};

/**
 * GET /api/admin/stats
 * Returns high-level platform statistics and operational metrics.
 */
const getAdminStats = async (req, res) => {
  try {
    const [
      totalUsers,
      totalStudents,
      totalClinics,
      pendingStudentVerifications,
      approvedStudentVerifications,
      rejectedStudentVerifications,
      pendingClinicVerifications,
      approvedClinicVerifications,
      rejectedClinicVerifications,
      totalInventory,
      availableInventory,
      totalRequirements,
      totalRequests,
      pendingRequests,
      fulfilledRequests,
    ] = await Promise.all([
      prisma.user.count(),
      prisma.student.count(),
      prisma.clinic.count(),
      prisma.student.count({ where: { verificationStatus: "PENDING" } }),
      prisma.student.count({ where: { verificationStatus: "APPROVED" } }),
      prisma.student.count({ where: { verificationStatus: "REJECTED" } }),
      prisma.clinic.count({ where: { verificationStatus: "PENDING" } }),
      prisma.clinic.count({ where: { verificationStatus: "APPROVED" } }),
      prisma.clinic.count({ where: { verificationStatus: "REJECTED" } }),
      prisma.inventory.count(),
      prisma.inventory.count({ where: { status: "AVAILABLE" } }),
      prisma.requirement.count(),
      prisma.request.count(),
      prisma.request.count({ where: { status: "PENDING" } }),
      prisma.request.count({ where: { status: "FULFILLED" } }),
    ]);

    return res.status(200).json({
      stats: {
        totalUsers,
        totalStudents,
        totalClinics,
        pendingStudentVerifications,
        approvedStudentVerifications,
        rejectedStudentVerifications,
        pendingClinicVerifications,
        approvedClinicVerifications,
        rejectedClinicVerifications,
        totalPendingVerifications: pendingStudentVerifications + pendingClinicVerifications,
        totalInventory,
        availableInventory,
        totalRequirements,
        totalRequests,
        pendingRequests,
        fulfilledRequests,
      },
    });
  } catch (error) {
    console.error("Admin stats error:", error);
    return res.status(500).json({
      message: "Internal server error fetching admin statistics",
    });
  }
};

/**
 * GET /api/admin/verifications
 * Returns student and clinic verifications, optionally filtered by status query param.
 * Query: status = PENDING (default) | APPROVED | REJECTED | ALL
 */
const getPendingVerifications = async (req, res) => {
  try {
    const requestedStatus = req.query.status ? String(req.query.status).toUpperCase() : "PENDING";
    const studentWhere = {};
    const clinicWhere = {};

    if (["PENDING", "APPROVED", "REJECTED"].includes(requestedStatus)) {
      studentWhere.verificationStatus = requestedStatus;
      clinicWhere.verificationStatus = requestedStatus;
    } else if (requestedStatus !== "ALL") {
      return res.status(400).json({
        message: "Invalid status filter. Allowed values: PENDING, APPROVED, REJECTED, ALL",
      });
    }

    const [students, clinics, counts] = await Promise.all([
      prisma.student.findMany({
        where: studentWhere,
        include: {
          user: {
            select: {
              id: true,
              name: true,
              email: true,
              role: true,
              status: true,
              createdAt: true,
            },
          },
        },
        orderBy: { createdAt: "desc" },
      }),
      prisma.clinic.findMany({
        where: clinicWhere,
        include: {
          user: {
            select: {
              id: true,
              name: true,
              email: true,
              role: true,
              status: true,
              createdAt: true,
            },
          },
        },
        orderBy: { createdAt: "desc" },
      }),
      getVerificationCounts(),
    ]);

    return res.status(200).json({
      students,
      clinics,
      totalPending: counts.totalPending,
      counts,
    });
  } catch (error) {
    console.error("Admin verifications error:", error);
    return res.status(500).json({
      message: "Internal server error fetching verifications queue",
    });
  }
};

/**
 * GET /api/admin/verifications/students
 * Returns student verifications, optionally filtered by status.
 * Query: status = PENDING (default) | APPROVED | REJECTED | ALL
 */
const getStudentVerifications = async (req, res) => {
  try {
    const requestedStatus = req.query.status ? String(req.query.status).toUpperCase() : "PENDING";
    const where = {};

    if (["PENDING", "APPROVED", "REJECTED"].includes(requestedStatus)) {
      where.verificationStatus = requestedStatus;
    } else if (requestedStatus !== "ALL") {
      return res.status(400).json({
        message: "Invalid status filter. Allowed values: PENDING, APPROVED, REJECTED, ALL",
      });
    }

    const [students, counts] = await Promise.all([
      prisma.student.findMany({
        where,
        include: {
          user: {
            select: {
              id: true,
              name: true,
              email: true,
              role: true,
              status: true,
              createdAt: true,
            },
          },
        },
        orderBy: { createdAt: "desc" },
      }),
      getVerificationCounts(),
    ]);

    return res.status(200).json({
      students,
      counts: counts.students,
      totalPending: counts.totalPending,
    });
  } catch (error) {
    console.error("Admin student verifications error:", error);
    return res.status(500).json({
      message: "Internal server error fetching student verifications",
    });
  }
};

/**
 * GET /api/admin/verifications/clinics
 * Returns clinic verifications, optionally filtered by status.
 * Query: status = PENDING (default) | APPROVED | REJECTED | ALL
 */
const getClinicVerifications = async (req, res) => {
  try {
    const requestedStatus = req.query.status ? String(req.query.status).toUpperCase() : "PENDING";
    const where = {};

    if (["PENDING", "APPROVED", "REJECTED"].includes(requestedStatus)) {
      where.verificationStatus = requestedStatus;
    } else if (requestedStatus !== "ALL") {
      return res.status(400).json({
        message: "Invalid status filter. Allowed values: PENDING, APPROVED, REJECTED, ALL",
      });
    }

    const [clinics, counts] = await Promise.all([
      prisma.clinic.findMany({
        where,
        include: {
          user: {
            select: {
              id: true,
              name: true,
              email: true,
              role: true,
              status: true,
              createdAt: true,
            },
          },
        },
        orderBy: { createdAt: "desc" },
      }),
      getVerificationCounts(),
    ]);

    return res.status(200).json({
      clinics,
      counts: counts.clinics,
      totalPending: counts.totalPending,
    });
  } catch (error) {
    console.error("Admin clinic verifications error:", error);
    return res.status(500).json({
      message: "Internal server error fetching clinic verifications",
    });
  }
};

/**
 * PATCH /api/admin/verifications/student/:id
 * Approves or rejects a student verification request.
 * Updates Student verificationStatus and User status consistently.
 */
const updateStudentVerification = async (req, res) => {
  try {
    const studentId = parseInt(req.params.id, 10);
    if (isNaN(studentId) || studentId <= 0) {
      return res.status(400).json({
        message: "Invalid student ID. ID must be a positive integer.",
      });
    }

    const { status } = req.body || {};
    if (!status || !["APPROVED", "REJECTED"].includes(status)) {
      return res.status(400).json({
        message: "status must be either 'APPROVED' or 'REJECTED'",
      });
    }

    const student = await prisma.student.findUnique({
      where: { id: studentId },
      include: { user: true },
    });

    if (!student) {
      return res.status(404).json({
        message: "Student record not found",
      });
    }

    // Validate status transition
    if (student.verificationStatus === status) {
      return res.status(400).json({
        message: `Student account is already ${status.toLowerCase()}. No status transition needed.`,
      });
    }

    const userStatus = status === "APPROVED" ? "ACTIVE" : "REJECTED";

    const updatedStudent = await prisma.$transaction(async (tx) => {
      const updated = await tx.student.update({
        where: { id: studentId },
        data: { verificationStatus: status },
        include: {
          user: {
            select: {
              id: true,
              name: true,
              email: true,
              role: true,
              status: true,
              createdAt: true,
            },
          },
        },
      });

      if (student.userId) {
        await tx.user.update({
          where: { id: student.userId },
          data: { status: userStatus },
        });
      }

      return updated;
    });

    // Notify student about verification outcome
    try {
      if (student.userId) {
        await notificationService.createNotification({
          userId: student.userId,
          type: "VERIFICATION_UPDATE",
          title:
            status === "APPROVED"
              ? "Student Verification Approved"
              : "Student Verification Declined",
          message:
            status === "APPROVED"
              ? "Your student credentials have been verified by an administrator. You can now request educational materials."
              : "Your student verification submission could not be verified. Please contact support.",
        });
      }
    } catch (notifErr) {
      console.warn("Failed to create verification notification:", notifErr.message);
    }

    return res.status(200).json({
      message: `Student verification status updated to ${status}`,
      student: updatedStudent,
    });
  } catch (error) {
    console.error("Update student verification error:", error);
    return res.status(500).json({
      message: "Internal server error updating student verification",
    });
  }
};

/**
 * PATCH /api/admin/verifications/clinic/:id
 * Approves or rejects a clinic verification request.
 * Updates Clinic verificationStatus and User status consistently.
 */
const updateClinicVerification = async (req, res) => {
  try {
    const clinicId = parseInt(req.params.id, 10);
    if (isNaN(clinicId) || clinicId <= 0) {
      return res.status(400).json({
        message: "Invalid clinic ID. ID must be a positive integer.",
      });
    }

    const { status } = req.body || {};
    if (!status || !["APPROVED", "REJECTED"].includes(status)) {
      return res.status(400).json({
        message: "status must be either 'APPROVED' or 'REJECTED'",
      });
    }

    const clinic = await prisma.clinic.findUnique({
      where: { id: clinicId },
      include: { user: true },
    });

    if (!clinic) {
      return res.status(404).json({
        message: "Clinic record not found",
      });
    }

    // Validate status transition
    if (clinic.verificationStatus === status) {
      return res.status(400).json({
        message: `Clinic account is already ${status.toLowerCase()}. No status transition needed.`,
      });
    }

    const userStatus = status === "APPROVED" ? "ACTIVE" : "REJECTED";

    const updatedClinic = await prisma.$transaction(async (tx) => {
      const updated = await tx.clinic.update({
        where: { id: clinicId },
        data: { verificationStatus: status },
        include: {
          user: {
            select: {
              id: true,
              name: true,
              email: true,
              role: true,
              status: true,
              createdAt: true,
            },
          },
        },
      });

      if (clinic.userId) {
        await tx.user.update({
          where: { id: clinic.userId },
          data: { status: userStatus },
        });
      }

      return updated;
    });

    // Notify clinic about verification outcome
    try {
      if (clinic.userId) {
        await notificationService.createNotification({
          userId: clinic.userId,
          type: "VERIFICATION_UPDATE",
          title:
            status === "APPROVED"
              ? "Clinic Verification Approved"
              : "Clinic Verification Declined",
          message:
            status === "APPROVED"
              ? "Your clinic registration has been verified by an administrator. You can now coordinate resource inventory."
              : "Your clinic verification submission could not be verified. Please contact support.",
        });
      }
    } catch (notifErr) {
      console.warn("Failed to create verification notification:", notifErr.message);
    }

    return res.status(200).json({
      message: `Clinic verification status updated to ${status}`,
      clinic: updatedClinic,
    });
  } catch (error) {
    console.error("Update clinic verification error:", error);
    return res.status(500).json({
      message: "Internal server error updating clinic verification",
    });
  }
};

/**
 * GET /api/admin/users
 * Returns list of all registered users with their profiles.
 */
const getAllUsers = async (req, res) => {
  try {
    const users = await prisma.user.findMany({
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        status: true,
        createdAt: true,
        student: {
          select: {
            id: true,
            institution: true,
            studentId: true,
            location: true,
            verificationStatus: true,
            verificationDocument: true,
          },
        },
        clinic: {
          select: {
            id: true,
            clinicName: true,
            doctorName: true,
            location: true,
            verificationStatus: true,
            verificationDocument: true,
          },
        },
      },
      orderBy: { createdAt: "desc" },
    });

    return res.status(200).json({
      count: users.length,
      users,
    });
  } catch (error) {
    console.error("Admin get all users error:", error);
    return res.status(500).json({
      message: "Internal server error fetching users",
    });
  }
};

module.exports = {
  getAdminStats,
  getPendingVerifications,
  getStudentVerifications,
  getClinicVerifications,
  updateStudentVerification,
  updateClinicVerification,
  getAllUsers,
};
