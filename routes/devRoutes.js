import express from "express";
import crypto from "crypto";
import sendEmail from "../utils/sendEmail.js";
import verificationEmail from "../utils/emailTemplates/verificationTemplate.js";

const router = express.Router();

// Dev-only: send a test verification email
router.post("/send-test-email", async (req, res) => {
  try {
    // Prevent accidental usage in production unless explicitly allowed
    if (
      process.env.NODE_ENV === "production" &&
      process.env.ALLOW_DEV_EMAILS !== "true"
    ) {
      return res.status(403).json({
        success: false,
        message: "Dev email endpoint disabled in production",
      });
    }

    const { email, name } = req.body;
    if (!email)
      return res
        .status(400)
        .json({ success: false, message: "Email is required" });

    const code = Math.floor(100000 + Math.random() * 900000).toString();

    await sendEmail({
      to: email,
      subject: "Test: Verify your account",
      text: `Your verification code is: ${code}`,
      html: verificationEmail({ name: name || "", code, expiresMinutes: 15 }),
    });

    return res.status(200).json({
      success: true,
      message: "Test verification email sent",
      data: { email },
    });
  } catch (err) {
    console.error("Dev send-test-email failed", err);
    return res.status(500).json({
      success: false,
      message: err.message || "Failed to send test email",
    });
  }
});

export default router;
