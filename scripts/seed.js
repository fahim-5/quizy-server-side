import mongoose from "mongoose";
import bcrypt from "bcryptjs";
import dotenv from "dotenv";

dotenv.config();

const MONGO =
  process.env.MONGODB_URI ||
  process.env.MONGO_URI ||
  "mongodb://127.0.0.1:27017/onlinequiz";

// Define minimal schemas matching the app models
const UserSchema = new mongoose.Schema(
  {
    name: String,
    identifier: { type: String, required: true, unique: true },
    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
    },
    password: String,
    role: {
      type: String,
      enum: ["student", "teacher"],
      default: "student",
    },
    isActive: { type: Boolean, default: true },
  },
  { timestamps: true },
);

const QuizSchema = new mongoose.Schema({
  title: { type: String, required: true },
  description: String,
  timeLimit: { type: Number, default: 0 },
  rules: { type: String },
  createdAt: { type: Date, default: Date.now },
});

const SubjectSchema = new mongoose.Schema({
  name: String,
  code: { type: String, unique: true },
  enrollKey: String,
  createdAt: { type: Date, default: Date.now },
});

const QuestionSchema = new mongoose.Schema({
  quiz: { type: mongoose.Schema.Types.ObjectId, ref: "Quiz", required: true },
  text: { type: String, required: true },
  options: [{ text: String }],
  correctIndex: { type: Number },
  points: { type: Number, default: 1 },
});

const ResultSchema = new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
  quiz: { type: mongoose.Schema.Types.ObjectId, ref: "Quiz", required: true },
  score: { type: Number, default: 0 },
  total: { type: Number, default: 0 },
  answers: [
    {
      question: { type: mongoose.Schema.Types.ObjectId, ref: "Question" },
      answerIndex: Number,
    },
  ],
  takenAt: { type: Date, default: Date.now },
});

const User = mongoose.models.User || mongoose.model("User", UserSchema);
const Quiz = mongoose.models.Quiz || mongoose.model("Quiz", QuizSchema);
const Subject =
  mongoose.models.Subject || mongoose.model("Subject", SubjectSchema);
const Question =
  mongoose.models.Question || mongoose.model("Question", QuestionSchema);
const Result = mongoose.models.Result || mongoose.model("Result", ResultSchema);

async function seed() {
  await mongoose.connect(MONGO);
  console.log("Connected to", MONGO);

  // Clear existing data (for idempotent seed)
  await Result.deleteMany({});
  await Question.deleteMany({});
  await Quiz.deleteMany({});
  await User.deleteMany({});

  // Create users
  const pwdAdmin = await bcrypt.hash("adminpass", 12);
  const pwdTeacher = await bcrypt.hash("teacherpass", 12);
  const pwdStudent = await bcrypt.hash("studentpass", 12);

  const admin = await User.create({
    name: "Admin User",
    identifier: "admin01",
    email: "admin@example.com",
    password: pwdAdmin,
    // Use `teacher` role for seeded admin account to match platform convention
    role: "teacher",
  });
  const teacher = await User.create({
    name: "Teacher User",
    identifier: "teacher01",
    email: "teacher@example.com",
    password: pwdTeacher,
    role: "teacher",
  });
  const student = await User.create({
    name: "Student User",
    identifier: "student01",
    email: "student@example.com",
    password: pwdStudent,
    role: "student",
  });

  console.log("Created users:", {
    teacherSeed: admin._id.toString(),
    teacher: teacher._id.toString(),
    student: student._id.toString(),
  });

  // Create quizzes
  // ensure a default subject exists
  let defaultSubject = await Subject.findOne({ code: "GEN101" });
  if (!defaultSubject) {
    defaultSubject = await Subject.create({
      name: "General",
      code: "GEN101",
      enrollKey: "123456",
    });
  }

  const quiz1 = await Quiz.create({
    title: "Data Structures Midterm",
    description: "Midterm quiz for CSE4165",
    timeLimit: 1800,
    rules: "No external resources. 1 attempt.",
    subject: defaultSubject._id,
  });
  const quiz2 = await Quiz.create({
    title: "Algorithms Quiz",
    description: "Weekly assessment",
    timeLimit: 900,
    rules: "Open book. 30 minutes.",
    subject: defaultSubject._id,
  });

  console.log("Created quizzes:", {
    quiz1: quiz1._id.toString(),
    quiz2: quiz2._id.toString(),
  });

  // Create questions for quiz1
  const q1 = await Question.create({
    quiz: quiz1._id,
    text: "What is the time complexity of binary search?",
    options: [{ text: "O(n)" }, { text: "O(log n)" }, { text: "O(n log n)" }],
    correctIndex: 1,
    points: 2,
  });
  const q2 = await Question.create({
    quiz: quiz1._id,
    text: "Which data structure uses LIFO?",
    options: [{ text: "Queue" }, { text: "Stack" }, { text: "Tree" }],
    correctIndex: 1,
    points: 1,
  });

  // Create questions for quiz2
  const q3 = await Question.create({
    quiz: quiz2._id,
    text: "Dijkstra algorithm solves which problem?",
    options: [
      { text: "Minimum spanning tree" },
      { text: "Shortest path from single source" },
      { text: "Topological sort" },
    ],
    correctIndex: 1,
    points: 2,
  });

  console.log("Created questions:", [
    q1._id.toString(),
    q2._id.toString(),
    q3._id.toString(),
  ]);

  // Create sample results (student attempts)
  const res1 = await Result.create({
    user: student._id,
    quiz: quiz1._id,
    score: 3,
    total: 3,
    answers: [
      { question: q1._id, answerIndex: 1 },
      { question: q2._id, answerIndex: 1 },
    ],
    duration: 1200,
  });
  const res2 = await Result.create({
    user: student._id,
    quiz: quiz2._id,
    score: 2,
    total: 2,
    answers: [{ question: q3._id, answerIndex: 1 }],
    duration: 800,
  });

  console.log("Created sample results:", [
    res1._id.toString(),
    res2._id.toString(),
  ]);

  // Optionally create leaderboard entries (other students)
  const s2 = await User.create({
    name: "Student Two",
    identifier: "student02",
    email: "student2@example.com",
    password: await bcrypt.hash("student2", 12),
    role: "student",
  });
  await Result.create({
    user: s2._id,
    quiz: quiz1._id,
    score: 2,
    total: 3,
    answers: [
      { question: q1._id, answerIndex: 0 },
      { question: q2._id, answerIndex: 1 },
    ],
    duration: 1500,
  });

  console.log("Seed complete. Documents counts:");
  const counts = {
    users: await User.countDocuments(),
    quizzes: await Quiz.countDocuments(),
    questions: await Question.countDocuments(),
    results: await Result.countDocuments(),
  };
  console.log(counts);

  await mongoose.disconnect();
  console.log("Disconnected.");
}

seed().catch((err) => {
  console.error(err);
  process.exit(1);
});
