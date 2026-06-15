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

  // Create index on quizzes.createdBy for faster owner queries
  try {
    const { default: Quiz } = await import("../models/Quiz.js");
    await Quiz.collection.createIndex({ createdBy: 1 });
    console.log("Created index on quizzes.createdBy");
  } catch (err) {
    console.error("Failed to create index:", err);
  }

  await mongoose.disconnect();
  console.log("Disconnected.");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
