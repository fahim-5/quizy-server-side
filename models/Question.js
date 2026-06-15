import mongoose from "mongoose";

const QuestionSchema = new mongoose.Schema({
  quiz: { type: mongoose.Schema.Types.ObjectId, ref: "Quiz", required: true },
  text: { type: String, required: true },
  // type: mcq | tf | short
  type: { type: String, enum: ["mcq", "tf", "short"], default: "mcq" },
  options: [
    {
      text: { type: String },
    },
  ],
  // For MCQ/TF store index of correct option. For TF, 0 = False, 1 = True (or vice-versa by UI)
  correctIndex: { type: Number },
  // For short answer expected text (optional)
  answerText: { type: String },
  points: { type: Number, default: 1, min: 1, max: 100 },
  // extraTime in seconds to allocate for this question (optional)
  extraTime: { type: Number, default: 0, min: 0 },
});

// Validate based on question type
QuestionSchema.pre("validate", function (next) {
  if (!this.text || typeof this.text !== "string" || this.text.trim() === "") {
    return next(new Error("Question text is required"));
  }

  if (this.type === "mcq") {
    if (!Array.isArray(this.options) || this.options.length < 2) {
      return next(new Error("MCQ must have at least two options"));
    }
    for (const opt of this.options) {
      if (!opt || typeof opt.text !== "string" || opt.text.trim() === "") {
        return next(new Error("Each option must have text"));
      }
    }
    if (
      typeof this.correctIndex === "undefined" ||
      this.correctIndex === null ||
      !Number.isInteger(this.correctIndex) ||
      this.correctIndex < 0 ||
      this.correctIndex >= this.options.length
    ) {
      return next(
        new Error("correctIndex must be a valid option index for MCQ"),
      );
    }
  } else if (this.type === "tf") {
    // allow either options provided (2) or no options - we will accept correctIndex 0 or 1
    if (
      typeof this.correctIndex === "undefined" ||
      this.correctIndex === null ||
      !Number.isInteger(this.correctIndex) ||
      this.correctIndex < 0 ||
      this.correctIndex > 1
    ) {
      return next(new Error("correctIndex must be 0 or 1 for True/False"));
    }
  } else if (this.type === "short") {
    // answerText optional; no options required
  }
  // ensure extraTime is non-negative number
  if (
    typeof this.extraTime !== "undefined" &&
    this.extraTime !== null &&
    (typeof this.extraTime !== "number" || Number(this.extraTime) < 0)
  ) {
    return next(new Error("extraTime must be a non-negative number"));
  }

  // points already constrained by schema min/max
  next();
});

const Question = mongoose.model("Question", QuestionSchema);

export default Question;
