const mongoose = require("mongoose");
const dotenv = require("dotenv");

dotenv.config();

async function connectDB(uri) {
  // Priority: explicit `uri` arg -> MONGODB_URI -> MONGO_URI -> constructed Atlas URI
  const constructedAtlas =
    process.env.MONGODB_URI ||
    process.env.MONGO_URI ||
    (() => {
      const user = process.env.MONGO_USER || "fahimbafu_db_user";
      const pass = process.env.MONGO_PASS
        ? encodeURIComponent(process.env.MONGO_PASS)
        : "";
      const cluster =
        process.env.MONGO_CLUSTER || "cluster0.zruszch.mongodb.net";
      const db = process.env.MONGO_DB || "onlinequizplatfrom";
      return `mongodb+srv://${user}:${pass}@${cluster}/${db}?retryWrites=true&w=majority&appName=Cluster0`;
    })();

  const mongoUri = uri || constructedAtlas;
  try {
    const conn = await mongoose.connect(mongoUri, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });
    const dbName =
      (conn && conn.connection && conn.connection.name) || "unknown";
    console.log("MongoDB connected");
    console.log(`  Database: ${dbName}`);
    try {
      // mask credentials for logging
      const masked = mongoUri.replace(
        /(mongodb(?:\+srv)?:\/\/)(.*@)?(.+)/,
        "$1***@***",
      );
      console.log(`  URI: ${masked}`);
    } catch (e) {
      console.log(`  URI: ${mongoUri}`);
    }
  } catch (err) {
    console.error("MongoDB connection error:", err.message);
    throw err;
  }
}

module.exports = connectDB;
