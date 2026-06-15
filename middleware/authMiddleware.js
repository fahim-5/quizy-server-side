// Development auth shim: attach a real dev user from the DB (find-or-create)
module.exports.protect = async (req, res, next) => {
  try {
    const UserMod = require("../models/User.js");
    // support both CJS and ESM default export
    const User = UserMod && UserMod.default ? UserMod.default : UserMod;

    if (!global.__dev_user) {
      let u = await User.findOne({ email: "dev@local" });
      if (!u) {
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
      global.__dev_user = u;
    }
    req.user = global.__dev_user;
    return next();
  } catch (e) {
    return next(e);
  }
};
