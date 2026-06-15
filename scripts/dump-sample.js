import mongoose from "mongoose";
import dotenv from "dotenv";
import fs from "fs";

dotenv.config();
const MONGO =
  process.env.MONGODB_URI ||
  process.env.MONGO_URI ||
  "mongodb://127.0.0.1:27017/onlinequiz";

const UserSchema = new mongoose.Schema(
  {
    name: String,
    identifier: String,
    role: String,
    isActive: Boolean,
  },
  { timestamps: true },
);

const QuizSchema = new mongoose.Schema(
  {
    title: String,
    description: String,
    timeLimit: Number,
    rules: String,
    createdAt: Date,
  },
  { timestamps: true },
);

const QuestionSchema = new mongoose.Schema({
  quiz: { type: mongoose.Schema.Types.ObjectId, ref: "Quiz" },
  text: String,
  options: [{ text: String }],
  correctIndex: Number,
  points: Number,
});

const ResultSchema = new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
  quiz: { type: mongoose.Schema.Types.ObjectId, ref: "Quiz" },
  score: Number,
  total: Number,
  answers: [
    {
      question: { type: mongoose.Schema.Types.ObjectId, ref: "Question" },
      answerIndex: Number,
    },
  ],
  takenAt: Date,
});

const User = mongoose.models.User || mongoose.model("User", UserSchema);
const Quiz = mongoose.models.Quiz || mongoose.model("Quiz", QuizSchema);
const Question =
  mongoose.models.Question || mongoose.model("Question", QuestionSchema);
const Result = mongoose.models.Result || mongoose.model("Result", ResultSchema);

async function dump() {
  await mongoose.connect(MONGO);
  console.log("Connected to", MONGO);

  const users = await User.find().select("-password -__v").lean();
  const quizzes = await Quiz.find().lean();
  const questions = await Question.find().lean();
  const results = await Result.find().lean();

  const out = {
    users,
    quizzes,
    questions,
    results,
    exportedAt: new Date().toISOString(),
  };

  const dest = "./sample-data.json";
  fs.writeFileSync(dest, JSON.stringify(out, null, 2), "utf8");
  console.log("Wrote", dest);

  await mongoose.disconnect();
  console.log("Disconnected");
}

dump().catch((err) => {
  console.error(err);
  process.exit(1);
});
