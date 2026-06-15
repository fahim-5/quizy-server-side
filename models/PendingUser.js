import mongoose from "mongoose";
import bcrypt from "bcryptjs";

const pendingUserSchema = new mongoose.Schema(
  {
    name: { type: String, trim: true, maxlength: 50 },
    identifier: { type: String, trim: true },
    email: { type: String, trim: true, lowercase: true, index: true },
    password: { type: String },
    role: { type: String, enum: ["student", "teacher"], default: "student" },
    institution: { type: String, trim: true, maxlength: 100 },
    emailVerificationCode: String,
    emailVerificationExpires: Date,
  },
  { timestamps: true },
);

const PendingUser = mongoose.model("PendingUser", pendingUserSchema);

export default PendingUser;
