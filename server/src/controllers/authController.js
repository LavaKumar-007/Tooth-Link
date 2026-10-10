const bcrypt = require("bcryptjs");
const { generateToken } = require("../utils/jwt");
const prisma = require("../utils/prisma");

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const MIN_PASSWORD_LENGTH = 6;

/**
 * Validate email format.
 */
const isValidEmail = (email) => {
  return typeof email === "string" && EMAIL_REGEX.test(email.trim());
};

/**
 * POST /api/auth/register/student
 * Registers a student user along with their student profile in a transaction.
 */
const registerStudent = async (req, res) => {
  try {
    const { name, email, password, institution, studentId, location, verificationDocument } = req.body || {};

    // 1. Validate required fields
    if (
      !name ||
      !email ||
      !password ||
      !institution ||
      !studentId ||
      !location ||
      !String(name).trim() ||
      !String(email).trim() ||
      !String(institution).trim() ||
      !String(studentId).trim() ||
      !String(location).trim()
    ) {
      return res.status(400).json({
        message: "All fields are required: name, email, password, institution, studentId, location",
      });
    }

    // 2. Validate email format
    if (!isValidEmail(email)) {
      return res.status(400).json({
        message: "Invalid email format",
      });
    }

    // 3. Validate password length
    if (typeof password !== "string" || password.length < MIN_PASSWORD_LENGTH) {
      return res.status(400).json({
        message: `Password must be at least ${MIN_PASSWORD_LENGTH} characters long`,
      });
    }

    const normalizedEmail = email.toLowerCase().trim();

    // 4. Check whether email already exists
    const existingUser = await prisma.user.findUnique({
      where: { email: normalizedEmail },
    });

    if (existingUser) {
      return res.status(409).json({
        message: "Email is already registered",
      });
    }

    // Check student unique constraint (institution + studentId)
    const existingStudent = await prisma.student.findUnique({
      where: {
        institution_studentId: {
          institution: institution.trim(),
          studentId: studentId.trim(),
        },
      },
    });

    if (existingStudent) {
      return res.status(409).json({
        message: "A student with this Student ID and institution already exists",
      });
    }

    // 5. Hash password using bcryptjs
    const salt = await bcrypt.genSalt(10);
    const passwordHash = await bcrypt.hash(password, salt);

    // 6. Prisma transaction to create User and Student profile atomically
    const newUser = await prisma.$transaction(async (tx) => {
      return await tx.user.create({
        data: {
          name: name.trim(),
          email: normalizedEmail,
          passwordHash,
          role: "STUDENT",
          student: {
            create: {
              institution: institution.trim(),
              studentId: studentId.trim(),
              location: location.trim(),
              verificationDocument: verificationDocument ? String(verificationDocument).trim() : null,
            },
          },
        },
        include: {
          student: true,
        },
      });
    });

    // 7. Return safe response without passwordHash
    const { passwordHash: _, ...safeUser } = newUser;
    return res.status(201).json({
      message: "Student registered successfully",
      user: safeUser,
    });
  } catch (error) {
    if (error.code === "P2002") {
      return res.status(409).json({
        message: "A record with these unique details already exists",
      });
    }
    console.error("Student registration error:", error);
    return res.status(500).json({
      message: "Internal server error during student registration",
    });
  }
};

/**
 * POST /api/auth/register/clinic
 * Registers a clinic user along with their clinic profile in a transaction.
 */
const registerClinic = async (req, res) => {
  try {
    const { name, email, password, clinicName, doctorName, location, verificationDocument } = req.body || {};

    // 1. Validate required fields
    if (
      !name ||
      !email ||
      !password ||
      !clinicName ||
      !doctorName ||
      !location ||
      !String(name).trim() ||
      !String(email).trim() ||
      !String(clinicName).trim() ||
      !String(doctorName).trim() ||
      !String(location).trim()
    ) {
      return res.status(400).json({
        message: "All fields are required: name, email, password, clinicName, doctorName, location",
      });
    }

    // 2. Validate email format
    if (!isValidEmail(email)) {
      return res.status(400).json({
        message: "Invalid email format",
      });
    }

    // 3. Validate password length
    if (typeof password !== "string" || password.length < MIN_PASSWORD_LENGTH) {
      return res.status(400).json({
        message: `Password must be at least ${MIN_PASSWORD_LENGTH} characters long`,
      });
    }

    const normalizedEmail = email.toLowerCase().trim();

    // 4. Check whether email already exists
    const existingUser = await prisma.user.findUnique({
      where: { email: normalizedEmail },
    });

    if (existingUser) {
      return res.status(409).json({
        message: "Email is already registered",
      });
    }

    // 5. Hash password using bcryptjs
    const salt = await bcrypt.genSalt(10);
    const passwordHash = await bcrypt.hash(password, salt);

    // 6. Prisma transaction to create User and Clinic profile atomically
    const newUser = await prisma.$transaction(async (tx) => {
      return await tx.user.create({
        data: {
          name: name.trim(),
          email: normalizedEmail,
          passwordHash,
          role: "CLINIC",
          clinic: {
            create: {
              clinicName: clinicName.trim(),
              doctorName: doctorName.trim(),
              location: location.trim(),
              verificationDocument: verificationDocument ? String(verificationDocument).trim() : null,
            },
          },
        },
        include: {
          clinic: true,
        },
      });
    });

    // 7. Return safe response without passwordHash
    const { passwordHash: _, ...safeUser } = newUser;
    return res.status(201).json({
      message: "Clinic registered successfully",
      user: safeUser,
    });
  } catch (error) {
    if (error.code === "P2002") {
      return res.status(409).json({
        message: "A record with these unique details already exists",
      });
    }
    console.error("Clinic registration error:", error);
    return res.status(500).json({
      message: "Internal server error during clinic registration",
    });
  }
};

/**
 * POST /api/auth/login
 * Authenticates user credentials, enforces status check, and returns a signed JWT.
 */
const login = async (req, res) => {
  try {
    const { email, password } = req.body || {};

    // 1. Validate required fields
    if (!email || !password || !String(email).trim()) {
      return res.status(400).json({
        message: "Email and password are required",
      });
    }

    const normalizedEmail = email.toLowerCase().trim();

    // 2. Find user by email
    const user = await prisma.user.findUnique({
      where: { email: normalizedEmail },
    });

    if (!user) {
      return res.status(401).json({
        message: "Invalid email or password",
      });
    }

    // 3. Compare password using bcryptjs
    const isPasswordValid = await bcrypt.compare(password, user.passwordHash);
    if (!isPasswordValid) {
      return res.status(401).json({
        message: "Invalid email or password",
      });
    }

    // 4. Reject users whose status is REJECTED
    if (user.status === "REJECTED") {
      return res.status(403).json({
        message: "Account has been rejected. Please contact support.",
      });
    }

    // 5. Generate JWT containing user id, role, and email using process.env.JWT_SECRET
    const token = generateToken({
      id: user.id,
      role: user.role,
      email: user.email,
    });

    // 6. Return token and user info without passwordHash
    return res.status(200).json({
      token,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
        status: user.status,
      },
    });
  } catch (error) {
    console.error("Login error:", error);
    return res.status(500).json({
      message: "Internal server error during login",
    });
  }
};

/**
 * GET /api/auth/me
 * Returns authenticated user profile using req.user populated by authMiddleware.
 */
const getMe = async (req, res) => {
  try {
    const user = await prisma.user.findUnique({
      where: { id: req.user.id },
      include: {
        student: true,
        clinic: true,
      },
    });

    if (!user) {
      return res.status(404).json({
        message: "User not found",
      });
    }

    const { passwordHash: _, ...safeUser } = user;
    return res.status(200).json({
      user: safeUser,
    });
  } catch (error) {
    console.error("GetMe error:", error);
    return res.status(500).json({
      message: "Internal server error fetching user profile",
    });
  }
};

module.exports = {
  registerStudent,
  registerClinic,
  login,
  getMe,
};
