const express = require("express");
const {
  registerStudent,
  registerClinic,
  login,
  getMe,
} = require("../controllers/authController");
const authMiddleware = require("../middleware/authMiddleware");

const router = express.Router();

/**
 * @route   POST /api/auth/register/student
 * @desc    Register a new student user and create associated student record
 * @access  Public
 */
router.post("/register/student", registerStudent);

/**
 * @route   POST /api/auth/register/clinic
 * @desc    Register a new clinic user and create associated clinic record
 * @access  Public
 */
router.post("/register/clinic", registerClinic);

/**
 * @route   POST /api/auth/login
 * @desc    Authenticate user, check active status, and return JWT
 * @access  Public
 */
router.post("/login", login);

/**
 * @route   GET /api/auth/me
 * @desc    Get currently authenticated user's profile
 * @access  Private (Requires valid JWT Bearer token)
 */
router.get("/me", authMiddleware, getMe);

module.exports = router;
