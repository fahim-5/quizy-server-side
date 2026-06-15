import express from "express";
import {
  register,
  login,
  devLogin,
  getMe,
  verifyEmail,
  resendVerification,
  requestPasswordReset,
  verifyPasswordReset,
  resetPassword,
} from "../controllers/authController.js";
import { protect } from "../middleware/auth.js";
import { validateUser } from "../middleware/validation.js";

const router = express.Router();

router.post("/register", validateUser, register);
router.post("/login", login);
router.post("/dev-login", devLogin);
router.post("/verify-email", verifyEmail);
router.post("/resend-verification", resendVerification);
router.post("/forgot-password", requestPasswordReset);
router.post("/verify-reset", verifyPasswordReset);
router.post("/reset-password", resetPassword);
router.get("/me", protect, getMe);

export default router;
