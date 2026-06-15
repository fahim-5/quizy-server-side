// Development / teaching mode auth shim
// This middleware bypasses JWT verification and ensures a real DB user
// exists for dev purposes. It will find-or-create a `dev@local` user and
// attach the actual DB document to `req.user` so ObjectId casts succeed.
import User from "../models/User.js";

let _cachedDevUser = null;

export const protect = async (req, res, next) => {
  try {
    // If the frontend provided a dev header, use that user (student or teacher)
    const uid = req.headers["x-user-id"] || req.headers["x-user-email"];
    if (uid) {
      let user = null;
      if (typeof uid === "string" && /^[0-9a-fA-F]{24}$/.test(uid)) {
        try {
          user = await User.findById(uid);
        } catch (e) {
          user = null;
        }
      }
      if (!user) {
        try {
          user = await User.findOne({ email: String(uid).toLowerCase() });
        } catch (e) {
          user = null;
        }
      }
      if (user) {
        req.user = user;
        return next();
      }
    }

    // Fallback: ensure a dev teacher exists and attach it
    if (!_cachedDevUser) {
      let u = await User.findOne({ email: "dev@local" });
      if (!u) {
        // Create a minimal dev user; password will be hashed by the model hook
        u = await User.create({
          name: "Dev User",
          identifier: "dev",
          email: "dev@local",
          password: "devpass",
          role: "teacher",
          institution: "local",
          isVerified: true,
        });
      }
      _cachedDevUser = u;
    }
    req.user = _cachedDevUser;
    return next();
  } catch (e) {
    return next(e);
  }
};

export const authorize = (...roles) => {
  return (req, res, next) => {
    if (!req.user) return next(new Error("Not authenticated"));
    if (!roles.includes(req.user.role))
      return next(new Error("Not authorized"));
    next();
  };
};

export const optionalAuth = async (req, res, next) => {
  try {
    // Support a lightweight dev header to identify the current user from the frontend
    const uid = req.headers["x-user-id"] || req.headers["x-user-email"];
    if (!uid) return next();

    // If x-user-id looks like an ObjectId (24 hex) try by id first
    let user = null;
    if (typeof uid === "string" && /^[0-9a-fA-F]{24}$/.test(uid)) {
      try {
        user = await User.findById(uid);
      } catch (e) {
        user = null;
      }
    }

    if (!user) {
      // try by email
      try {
        user = await User.findOne({ email: String(uid).toLowerCase() });
      } catch (e) {
        user = null;
      }
    }

    if (user) req.user = user;
    return next();
  } catch (e) {
    return next();
  }
};
