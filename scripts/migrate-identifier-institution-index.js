import mongoose from "mongoose";
import dotenv from "dotenv";

dotenv.config();

const MONGO =
  process.env.MONGODB_URI ||
  process.env.MONGO_URI ||
  "mongodb://127.0.0.1:27017/onlinequiz";

async function main() {
  await mongoose.connect(MONGO, {
    useNewUrlParser: true,
    useUnifiedTopology: true,
  });
  console.log("Connected to", MONGO);

  const { default: User } = await import("../models/User.js");

  // 1) Find duplicate identifier+institution groups
  const duplicates = await User.aggregate([
    {
      $group: {
        _id: { identifier: "$identifier", institution: "$institution" },
        count: { $sum: 1 },
        ids: { $push: "$_id" },
      },
    },
    { $match: { count: { $gt: 1 } } },
  ]);

  console.log(
    `Found ${duplicates.length} duplicate identifier+institution groups`,
  );

  let fixed = 0;

  for (const grp of duplicates) {
    const identifier = grp._id.identifier || "";
    const institution = grp._id.institution || "";
    const ids = grp.ids || [];
    // Keep the earliest (smallest ObjectId) and rename others
    ids.sort();
    const keep = ids[0];
    const toFix = ids.slice(1);
    for (let i = 0; i < toFix.length; i++) {
      const docId = toFix[i];
      // make a new unique identifier by appending suffix; ensure it does not clash
      let candidate;
      let suffix = 1;
      do {
        candidate = `${identifier}-dup-${suffix}`;
        suffix += 1;
      } while (await User.exists({ identifier: candidate, institution }));

      await User.updateOne({ _id: docId }, { $set: { identifier: candidate } });
      console.log(
        `Renamed user ${docId} identifier -> ${candidate} (institution: ${institution})`,
      );
      fixed += 1;
    }
  }

  // 2) Drop old single-field unique index on identifier if present
  try {
    const indexes = await User.collection.indexes();
    const idIndex = indexes.find(
      (ix) =>
        ix.key && ix.key.identifier === 1 && Object.keys(ix.key).length === 1,
    );
    if (idIndex && idIndex.name) {
      console.log(`Dropping old index: ${idIndex.name}`);
      try {
        await User.collection.dropIndex(idIndex.name);
        console.log(`Dropped index ${idIndex.name}`);
      } catch (err) {
        console.warn(
          `Failed to drop index ${idIndex.name}:`,
          err.message || err,
        );
      }
    } else {
      console.log("No single-field identifier index found to drop");
    }
  } catch (err) {
    console.warn("Could not inspect/drop old indexes:", err.message || err);
  }

  // 3) Create compound unique index on identifier + institution
  try {
    await User.collection.createIndex(
      { identifier: 1, institution: 1 },
      { unique: true, sparse: true },
    );
    console.log("Created compound unique index on {identifier, institution}");
  } catch (err) {
    console.error("Failed to create compound index:", err.message || err);
  }

  console.log(`Fixed ${fixed} conflicting user identifiers.`);

  await mongoose.disconnect();
  console.log("Disconnected.");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
