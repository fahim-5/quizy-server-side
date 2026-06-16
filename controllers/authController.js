import crypto from "crypto";
import User from "../models/User.js";
import PendingUser from "../models/PendingUser.js";
import AppError from "../utils/appError.js";
import sendEmail from "../utils/sendEmail.js";
import verificationEmail from "../utils/emailTemplates/verificationTemplate.js";

// Tokens removed for dev mode: endpoints return user data only

// @desc    Register user
// @route   POST /api/auth/register
// @access  Public
export const register = async (req, res, next) => {
  try {
    const { id, email, password, role, name, institution } = req.body;

    if (!id || !password || !email || !institution || !role)
      return next(
        new AppError(
          "Identifier, email, password, institution and role are required",
          400,
        ),
      );

    if ((password || "").length < 6)
      return next(
        new AppError("Password must be at least 6 characters long", 400),
      );

    // Check if user exists by identifier within the same institution
    const existingById = await User.findOne({ identifier: id, institution });
    if (existingById) {
      return next(
        new AppError("This ID is already registered for this institution", 400),
      );
    }

    // Check if email already registered (global)
    const existingByEmail = await User.findOne({ email: email.toLowerCase() });
    if (existingByEmail) {
      return next(new AppError("This email already has an account", 400));
    }

    // Create a pending registration record and send verification code
    const code = Math.floor(100000 + Math.random() * 900000).toString(); // 6-digit
    const codeHash = crypto.createHash("sha256").update(code).digest("hex");
    const expires = Date.now() + 1000 * 60 * 15; // 15 minutes

    // If a pending record exists, update it; otherwise create
    let pending = await PendingUser.findOne({ email: email.toLowerCase() });
    if (pending) {
      pending.name = name || pending.name;
      pending.identifier = id || pending.identifier;
      pending.password = password;
      pending.role = role || pending.role;
      pending.institution = institution || pending.institution;
      pending.emailVerificationCode = codeHash;
      pending.emailVerificationExpires = new Date(expires);
      await pending.save();
    } else {
      pending = await PendingUser.create({
        name: name || undefined,
        identifier: id,
        email: email.toLowerCase(),
        password,
        role,
        institution: institution || undefined,
        emailVerificationCode: codeHash,
        emailVerificationExpires: new Date(expires),
      });
    }

    // send email (best-effort). capture preview URL or error info
    let preview;
    let emailError;
    const sent = await sendEmail({
      to: pending.email,
      subject: "Verify your account",
      text: `Your verification code is: ${code}`,
      html: verificationEmail({
        name: pending.name || pending.identifier,
        code,
        expiresMinutes: 15,
      }),
    });

    if (sent) {
      if (sent.error) {
        // log server-side and keep moving
        // eslint-disable-next-line no-console
        console.warn(
          "Failed to send verification email:",
          sent.message || sent,
        );
        emailError = sent.message || "Failed to send email";
      } else if (sent.preview) {
        preview = sent.preview;
      }
    }

    const responseData = { email: pending.email, preview };
    // expose email error only for non-production debugging or when explicitly allowed
    if (
      emailError &&
      (process.env.NODE_ENV !== "production" ||
        process.env.SHOW_EMAIL_ERRORS === "true")
    ) {
      responseData.emailError = emailError;
    }

    res.status(201).json({
      success: true,
      message: "Verification code sent to email",
      data: responseData,
    });
  } catch (error) {
    next(error);
  }
};

export const verifyEmail = async (req, res, next) => {
  try {
    const { email, code } = req.body;
    if (!email || !code)
      return next(new AppError("Email and code are required", 400));
    const pending = await PendingUser.findOne({
      email: email.toLowerCase(),
    }).lean();
    if (!pending)
      return next(new AppError("Pending registration not found", 404));
    if (!pending.emailVerificationCode || !pending.emailVerificationExpires)
      return next(
        new AppError("No verification pending for this account", 400),
      );
    if (new Date(pending.emailVerificationExpires).getTime() < Date.now())
      return next(new AppError("Verification code expired", 400));

    const codeHash = crypto
      .createHash("sha256")
      .update(code.toString())
      .digest("hex");
    if (codeHash !== pending.emailVerificationCode)
      return next(new AppError("Invalid verification code", 400));

    // create real user now
    const newUser = await User.create({
      name: pending.name,
      identifier: pending.identifier,
      email: pending.email,
      password: pending.password,
      role: pending.role,
      institution: pending.institution,
      isVerified: true,
    });

    // remove pending record
    await PendingUser.deleteOne({ _id: pending._id });

    res.status(200).json({ success: true, data: { user: newUser } });
  } catch (err) {
    next(err);
  }
};

export const resendVerification = async (req, res, next) => {
  try {
    const { email } = req.body;
    if (!email) return next(new AppError("Email is required", 400));
    const pending = await PendingUser.findOne({ email: email.toLowerCase() });
    if (!pending)
      return next(new AppError("Pending registration not found", 404));

    const code = Math.floor(100000 + Math.random() * 900000).toString();
    const codeHash = crypto.createHash("sha256").update(code).digest("hex");
    const expires = Date.now() + 1000 * 60 * 15;

    pending.emailVerificationCode = codeHash;
    pending.emailVerificationExpires = new Date(expires);
    await pending.save();

    let preview;
    let emailError;
    const sent = await sendEmail({
      to: pending.email,
      subject: "Verify your account - code resent",
      text: `Your verification code is: ${code}`,
      html: verificationEmail({
        name: pending.name || pending.identifier,
        code,
        expiresMinutes: 15,
      }),
    });

    if (sent) {
      if (sent.error) {
        // eslint-disable-next-line no-console
        console.warn(
          "Failed to resend verification email:",
          sent.message || sent,
        );
        emailError = sent.message || "Failed to send email";
      } else if (sent.preview) {
        preview = sent.preview;
      }
    }

    const responseData = { email: pending.email, preview };
    if (
      emailError &&
      (process.env.NODE_ENV !== "production" ||
        process.env.SHOW_EMAIL_ERRORS === "true")
    ) {
      responseData.emailError = emailError;
    }

    res.status(200).json({
      success: true,
      message: "Verification code resent",
      data: responseData,
    });
  } catch (err) {
    next(err);
  }
};

// @desc    Request password reset (send code)
// @route   POST /api/auth/forgot-password
// @access  Public
export const requestPasswordReset = async (req, res, next) => {
  try {
    const { email } = req.body;
    if (!email) return next(new AppError("Email is required", 400));
    const user = await User.findOne({ email: email.toLowerCase() });
    if (!user) return next(new AppError("User not found", 404));

    const code = Math.floor(100000 + Math.random() * 900000).toString();
    const codeHash = crypto.createHash("sha256").update(code).digest("hex");
    const expires = Date.now() + 1000 * 60 * 15; // 15 minutes

    user.passwordResetCode = codeHash;
    user.passwordResetExpires = new Date(expires);
    await user.save();

    let preview;
    let emailError;
    const sent = await sendEmail({
      to: user.email,
      subject: "Password reset code",
      text: `Your password reset code is: ${code}`,
      html: verificationEmail({
        name: user.name || user.identifier,
        code,
        expiresMinutes: 15,
      }),
    });

    if (sent) {
      if (sent.error) {
        // eslint-disable-next-line no-console
        console.warn(
          "Failed to send password reset email:",
          sent.message || sent,
        );
        emailError = sent.message || "Failed to send email";
      } else if (sent.preview) {
        preview = sent.preview;
      }
    }

    const responseData = { email: user.email, preview };
    if (
      emailError &&
      (process.env.NODE_ENV !== "production" ||
        process.env.SHOW_EMAIL_ERRORS === "true")
    ) {
      responseData.emailError = emailError;
    }

    res.status(200).json({
      success: true,
      message: "Reset code sent",
      data: responseData,
    });
  } catch (err) {
    next(err);
  }
};

// @desc    Verify password reset code
// @route   POST /api/auth/verify-reset
// @access  Public
export const verifyPasswordReset = async (req, res, next) => {
  try {
    const { email, code } = req.body;
    if (!email || !code)
      return next(new AppError("Email and code are required", 400));
    const user = await User.findOne({ email: email.toLowerCase() }).select(
      "+passwordResetCode +passwordResetExpires",
    );
    if (!user) return next(new AppError("User not found", 404));
    if (!user.passwordResetCode || !user.passwordResetExpires)
      return next(new AppError("No reset requested for this account", 400));
    if (user.passwordResetExpires.getTime() < Date.now())
      return next(new AppError("Reset code expired", 400));

    const codeHash = crypto
      .createHash("sha256")
      .update(code.toString())
      .digest("hex");
    if (codeHash !== user.passwordResetCode)
      return next(new AppError("Invalid reset code", 400));

    res.status(200).json({ success: true, message: "Code valid" });
  } catch (err) {
    next(err);
  }
};

// @desc    Reset password
// @route   POST /api/auth/reset-password
// @access  Public
export const resetPassword = async (req, res, next) => {
  try {
    const { email, code, password } = req.body;
    if (!email || !code || !password)
      return next(
        new AppError("Email, code and new password are required", 400),
      );
    if ((password || "").length < 6)
      return next(
        new AppError("Password must be at least 6 characters long", 400),
      );

    const user = await User.findOne({ email: email.toLowerCase() }).select(
      "+passwordResetCode +passwordResetExpires +password",
    );
    if (!user) return next(new AppError("User not found", 404));
    if (!user.passwordResetCode || !user.passwordResetExpires)
      return next(new AppError("No reset requested for this account", 400));
    if (user.passwordResetExpires.getTime() < Date.now())
      return next(new AppError("Reset code expired", 400));

    const codeHash = crypto
      .createHash("sha256")
      .update(code.toString())
      .digest("hex");
    if (codeHash !== user.passwordResetCode)
      return next(new AppError("Invalid reset code", 400));

    user.password = password;
    user.passwordResetCode = undefined;
    user.passwordResetExpires = undefined;
    await user.save();

    res.status(200).json({ success: true, message: "Password updated" });
  } catch (err) {
    next(err);
  }
};

// @desc    Login user
// @route   POST /api/auth/login
// @access  Public
export const login = async (req, res, next) => {
  try {
    const { id, password, email } = req.body;

    // Allow login by id or email
    if ((!id && !email) || !password) {
      return next(new AppError("Please provide id/email and password", 400));
    }

    let user;
    if (email) {
      user = await User.findOne({ email: email.toLowerCase() }).select(
        "+password",
      );
    } else {
      user = await User.findOne({ identifier: id }).select("+password");
    }

    if (!user || !(await user.comparePassword(password))) {
      return next(new AppError("Invalid credentials", 401));
    }

    res.status(200).json({ success: true, data: { user } });
  } catch (error) {
    next(error);
  }
};

// Development helper: find-or-create a dev user by identifier or email
export const devLogin = async (req, res, next) => {
  try {
    const { id, email, role, name } = req.body;
    if (!id && !email) {
      return res
        .status(400)
        .json({ success: false, message: "Provide id or email" });
    }

    let user = null;
    if (email)
      user = await User.findOne({ email: String(email).toLowerCase() });
    if (!user && id) user = await User.findOne({ identifier: String(id) });

    if (!user) {
      const payload = {
        name: name || (email ? email.split("@")[0] : id),
        identifier: id || (email ? email.split("@")[0] : `dev_${Date.now()}`),
        email: email
          ? String(email).toLowerCase()
          : `${(id || "dev").toString()}@local`,
        password: "devpass",
        role: role === "teacher" ? "teacher" : "student",
        institution: "local",
        isVerified: true,
      };
      user = await User.create(payload);
    }

    res.status(200).json({ success: true, data: { user } });
  } catch (err) {
    next(err);
  }
};

// @desc    Get current user
// @route   GET /api/auth/me
// @access  Private
export const getMe = async (req, res, next) => {
  try {
    // Try to resolve a DB user by id (_id or id); if not found return req.user (dev shim)
    const lookupId = req.user && (req.user._id || req.user.id);
    let found = null;
    if (lookupId) {
      try {
        found = await User.findById(lookupId);
      } catch (e) {
        found = null;
      }
    }
    const outUser = found || req.user || null;
    res.status(200).json({ success: true, data: { user: outUser } });
  } catch (error) {
    next(error);
  }
};
