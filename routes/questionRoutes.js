import express from "express";
import questionController from "../controllers/questionController.js";
import { protect, optionalAuth } from "../middleware/auth.js";

const router = express.Router({ mergeParams: true });

router.get(
  "/quiz/:quizId",
  optionalAuth,
  questionController.getQuestionsForQuiz,
);
router.post("/", protect, questionController.createQuestion);
router.get("/:id", protect, questionController.getQuestion);
router.put("/:id", protect, questionController.updateQuestion);
router.delete("/:id", protect, questionController.deleteQuestion);

export default router;
