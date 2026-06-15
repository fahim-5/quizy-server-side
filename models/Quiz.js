import mongoose from "mongoose";

const QuizSchema = new mongoose.Schema({
  title: { type: String, required: true },
  // Link quiz to a subject (required)
  subject: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Subject",
    required: true,
  },
  // Which teacher created this quiz
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: "User", index: true },
  description: { type: String },
  timeLimit: { type: Number, default: 0 }, // seconds
  rules: { type: String }, // human readable rules/notes
  // Scheduling: when quiz becomes visible to students and when the exam may be started
  visibleFrom: { type: Date },
  startFrom: { type: Date },
  // Optional short join code (e.g. 6-digit) for student quick-join without login
  joinCode: { type: String, index: true, unique: false },
  isActive: { type: Boolean, default: true },
  // How many attempts allowed: 'single' or 'multiple'
  attemptsAllowed: {
    type: String,
    enum: ["single", "multiple"],
    default: "single",
  },
  // Shuffle questions when presenting
  shuffleQuestions: { type: Boolean, default: false },
  // Show answers after submission
  showAnswersAfterSubmission: { type: Boolean, default: false },
  // Access control: public by code, or private (class list not implemented yet)
  access: { type: String, enum: ["public", "private"], default: "public" },
  // When access is private, list of allowed identifiers (emails, ids, class names)
  allowedList: [{ type: String }],
  // Status: draft or live
  status: { type: String, enum: ["draft", "live"], default: "draft" },
  deletedAt: { type: Date },
  deletedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
  createdAt: { type: Date, default: Date.now },
});

const Quiz = mongoose.model("Quiz", QuizSchema);

export default Quiz;
