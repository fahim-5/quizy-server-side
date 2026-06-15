import mongoose from "mongoose";

const AnswerSchema = new mongoose.Schema({
  question: { type: mongoose.Schema.Types.ObjectId, ref: "Question" },
  answer: { type: String },
  correct: { type: Boolean },
  pointsAwarded: { type: Number, default: 0 },
  submittedAt: { type: Date, default: Date.now },
});

const LiveParticipantSchema = new mongoose.Schema({
  quiz: { type: mongoose.Schema.Types.ObjectId, ref: "Quiz", required: true },
  user: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
  name: { type: String },
  status: {
    type: String,
    enum: ["joined", "answering", "done"],
    default: "joined",
  },
  answers: [AnswerSchema],
  joinedAt: { type: Date, default: Date.now },
  lastActive: { type: Date, default: Date.now },
});

const LiveParticipant = mongoose.model(
  "LiveParticipant",
  LiveParticipantSchema,
);

export default LiveParticipant;
