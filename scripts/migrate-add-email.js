import mongoose from "mongoose";
import dotenv from "dotenv";

dotenv.config();

const MONGO =
  process.env.MONGODB_URI ||
  process.env.MONGO_URI ||
  "mongodb://127.0.0.1:27017/onlinequiz";

async function main() {
  await mongoose.connect(MONGO);
  console.log("Connected to", MONGO);

  // Load User model (use app model to respect schema)
  const { default: User } = await import("../models/User.js");

  // Find users missing email
  const missing = await User.find({
    $or: [{ email: { $exists: false } }, { email: null }, { email: "" }],
  }).lean();
  console.log(`Found ${missing.length} users without email`);

  let updated = 0;

  for (const u of missing) {
    const base = (
      u.identifier ||
      (u._id && u._id.toString().slice(0, 8)) ||
      "user"
    )
      .toString()
      .toLowerCase()
      .replace(/[^a-z0-9]/g, "");
    let candidate = `${base}@example.com`;
    let suffix = 0;
    // Ensure uniqueness
    while (await User.exists({ email: candidate })) {
      suffix += 1;
      candidate = `${base}+${suffix}@example.com`;
    }

    await User.updateOne({ _id: u._id }, { $set: { email: candidate } });
    console.log(`Set email for user ${u._id} -> ${candidate}`);
    updated += 1;
  }

  console.log(`Updated ${updated} users.`);
  await mongoose.disconnect();
  console.log("Disconnected.");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
