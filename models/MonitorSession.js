import mongoose from "mongoose";

const AnnouncementSchema = new mongoose.Schema({
  message: { type: String },
  createdAt: { type: Date, default: Date.now },
});

const MonitorSessionSchema = new mongoose.Schema({
  quiz: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Quiz",
    required: true,
    unique: true,
  },
  isPaused: { type: Boolean, default: false },
  isEnded: { type: Boolean, default: false },
  announcements: [AnnouncementSchema],
  updatedAt: { type: Date, default: Date.now },
});

const MonitorSession = mongoose.model("MonitorSession", MonitorSessionSchema);

export default MonitorSession;
