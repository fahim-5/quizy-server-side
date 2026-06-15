import mongoose from "mongoose";

const ResultSchema = new mongoose.Schema({
  // `user` may be null for guest attempts; prefer storing `guestName` instead
  user: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: false },
  guestName: { type: String },
  quiz: { type: mongoose.Schema.Types.ObjectId, ref: "Quiz", required: true },
  score: { type: Number, default: 0 },
  total: { type: Number, default: 0 },
  answers: [
    {
      question: { type: mongoose.Schema.Types.ObjectId, ref: "Question" },
      answerIndex: Number,
    },
  ],
  // When the user started the quiz (for enforcing time limits)
  startedAt: { type: Date },
  // status: 'in-progress' when started, 'completed' after submission
  status: {
    type: String,
    enum: ["in-progress", "completed"],
    default: "completed",
  },
  endedAt: { type: Date },
  duration: { type: Number },
  takenAt: { type: Date, default: Date.now },
});

const Result = mongoose.model("Result", ResultSchema);

export default Result;
