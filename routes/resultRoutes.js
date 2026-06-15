import express from "express";
import {
  startResult,
  submitResult,
  getResultsForUser,
  getMyResults,
  getMySummary,
  leaderboardForQuiz,
  quizStats,
  participationSummary,
  exportLeaderboardCSV,
  questionAnalysis,
  getStudentReport,
  updateDraft,
  exportReportPDF,
  getResultById,
} from "../controllers/resultController.js";
import { protect, authorize, optionalAuth } from "../middleware/auth.js";

const router = express.Router();

// Allow guests to start and submit results (join by code) — authentication optional
router.post("/start", optionalAuth, startResult);
router.post("/", optionalAuth, submitResult);
router.get("/user/:userId", protect, getResultsForUser);
router.get("/me", protect, getMyResults);
router.get("/me/summary", protect, getMySummary);
// Teacher analytics (formerly admin)
router.get(
  "/teacher/leaderboard/:quizId",
  protect,
  authorize("teacher"),
  leaderboardForQuiz,
);
router.get(
  "/teacher/quiz/:quizId/stats",
  protect,
  authorize("teacher"),
  quizStats,
);
router.get(
  "/teacher/quiz/:quizId/analysis",
  protect,
  authorize("teacher"),
  questionAnalysis,
);
router.get(
  "/teacher/quiz/:quizId/student/:studentId",
  protect,
  authorize("teacher"),
  getStudentReport,
);
router.get(
  "/teacher/participation",
  protect,
  authorize("teacher"),
  participationSummary,
);
router.get(
  "/teacher/quiz/:quizId/export",
  protect,
  authorize("teacher"),
  exportLeaderboardCSV,
);

router.get(
  "/teacher/quiz/:quizId/export/pdf",
  protect,
  authorize("teacher"),
  exportReportPDF,
);

// Update draft answers (autosave) - user must be authenticated and owner
router.put("/:id", protect, updateDraft);

// fetch single result (populated)
router.get("/:id", protect, getResultById);

export default router;
