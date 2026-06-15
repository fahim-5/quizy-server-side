import Question from "../models/Question.js";
import Quiz from "../models/Quiz.js";

const createQuestion = async (req, res, next) => {
  try {
    const question = await Question.create(req.body);

    // If question has extraTime, add it to parent quiz timeLimit
    try {
      const extra = Number(question.extraTime) || 0;
      if (extra > 0) {
        await Quiz.findByIdAndUpdate(question.quiz, {
          $inc: { timeLimit: extra },
        });
      }
    } catch (e) {
      // non-fatal: log and continue
      console.error("Failed to adjust quiz timeLimit after createQuestion", e);
    }

    res.status(201).json({ success: true, question });
  } catch (err) {
    next(err);
  }
};

const getQuestionsForQuiz = async (req, res, next) => {
  try {
    // Teachers (authenticated) should receive correctIndex so they can set/verify answers.
    const query = Question.find({ quiz: req.params.quizId });
    if (!(req.user && req.user.role === "teacher")) {
      query.select("-correctIndex");
    }
    const questions = await query;
    res.json({ success: true, questions });
  } catch (err) {
    next(err);
  }
};

const deleteQuestion = async (req, res, next) => {
  try {
    const q = await Question.findById(req.params.id);
    if (!q)
      return res
        .status(404)
        .json({ success: false, message: "Question not found" });
    const extra = Number(q.extraTime) || 0;
    await Question.findByIdAndDelete(req.params.id);
    try {
      if (extra > 0) {
        // decrement quiz timeLimit but ensure it does not go negative
        const quiz = await Quiz.findById(q.quiz);
        if (quiz) {
          quiz.timeLimit = Math.max(0, (quiz.timeLimit || 0) - extra);
          await quiz.save();
        }
      }
    } catch (e) {
      console.error("Failed to adjust quiz timeLimit after deleteQuestion", e);
    }
    res.json({ success: true, message: "Deleted" });
  } catch (err) {
    next(err);
  }
};

const getQuestion = async (req, res, next) => {
  try {
    const query = Question.findById(req.params.id);
    if (!(req.user && req.user.role === "teacher")) {
      query.select("-correctIndex");
    }
    const question = await query;
    if (!question)
      return res
        .status(404)
        .json({ success: false, message: "Question not found" });
    res.json({ success: true, question });
  } catch (err) {
    next(err);
  }
};

const updateQuestion = async (req, res, next) => {
  try {
    const updates = req.body;
    // compute delta for extraTime
    const orig = await Question.findById(req.params.id);
    const origExtra = orig ? Number(orig.extraTime) || 0 : 0;
    const newExtra =
      typeof updates.extraTime !== "undefined"
        ? Number(updates.extraTime) || 0
        : origExtra;

    const question = await Question.findByIdAndUpdate(req.params.id, updates, {
      new: true,
      runValidators: true,
    });

    if (!question)
      return res
        .status(404)
        .json({ success: false, message: "Question not found" });

    // If requester is not teacher, strip correctIndex in response
    const out = question.toObject();
    if (!(req.user && req.user.role === "teacher")) {
      delete out.correctIndex;
    }
    // adjust quiz timeLimit if extraTime changed
    try {
      const delta = (newExtra || 0) - (origExtra || 0);
      if (delta !== 0) {
        if (delta > 0) {
          await Quiz.findByIdAndUpdate(question.quiz, {
            $inc: { timeLimit: delta },
          });
        } else {
          // negative delta: decrement but don't go below zero
          const quiz = await Quiz.findById(question.quiz);
          if (quiz) {
            quiz.timeLimit = Math.max(0, (quiz.timeLimit || 0) + delta);
            await quiz.save();
          }
        }
      }
    } catch (e) {
      console.error("Failed to adjust quiz timeLimit after updateQuestion", e);
    }

    res.json({ success: true, question: out });
  } catch (err) {
    next(err);
  }
};

export default {
  createQuestion,
  getQuestionsForQuiz,
  getQuestion,
  updateQuestion,
  deleteQuestion,
};
