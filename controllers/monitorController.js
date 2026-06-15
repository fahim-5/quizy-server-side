import LiveParticipant from "../models/LiveParticipant.js";
import MonitorSession from "../models/MonitorSession.js";
import Question from "../models/Question.js";
import Quiz from "../models/Quiz.js";
import { getIo } from "../utils/socket.js";

const joinSession = async (req, res, next) => {
  try {
    const quizId = req.params.id;
    const name = req.body.name || (req.user && req.user.name) || "Guest";

    // Upsert participant by user id if available, otherwise create new guest participant
    let participant;
    if (req.user) {
      participant = await LiveParticipant.findOne({
        quiz: quizId,
        user: req.user._id,
      });
      if (!participant) {
        participant = await LiveParticipant.create({
          quiz: quizId,
          user: req.user._id,
          name,
        });
      } else {
        participant.name = name;
        participant.lastActive = new Date();
        participant.status = "joined";
        await participant.save();
      }
    } else {
      participant = await LiveParticipant.create({ quiz: quizId, name });
    }

    res.json({ success: true, participant });
    // emit update to room
    const io = getIo();
    if (io) io.to(`quiz-${quizId}`).emit("participant:joined", { participant });
  } catch (err) {
    next(err);
  }
};

const submitAnswer = async (req, res, next) => {
  try {
    const quizId = req.params.id;
    const { participantId, questionId, answer } = req.body;
    if (!participantId || !questionId)
      return res
        .status(400)
        .json({ message: "participantId and questionId required" });

    const participant = await LiveParticipant.findById(participantId);
    if (!participant)
      return res.status(404).json({ message: "Participant not found" });

    const question = await Question.findById(questionId);
    if (!question)
      return res.status(404).json({ message: "Question not found" });

    let correct = false;
    if (question.type === "mcq" || question.type === "tf") {
      // answer may be index or string
      const idx = Number(answer);
      correct = Number.isInteger(idx) && idx === question.correctIndex;
    } else if (question.type === "short") {
      if (question.answerText && typeof answer === "string") {
        correct =
          question.answerText.trim().toLowerCase() ===
          answer.trim().toLowerCase();
      }
    }

    const pointsAwarded = correct ? question.points || 1 : 0;

    participant.answers.push({
      question: questionId,
      answer: String(answer),
      correct,
      pointsAwarded,
      submittedAt: new Date(),
    });
    participant.lastActive = new Date();
    participant.status = "done";
    await participant.save();

    // emit answer update
    const io = getIo();
    if (io)
      io.to(`quiz-${quizId}`).emit("answer:submitted", {
        participantId: participant._id,
        questionId,
        answer,
        correct,
        pointsAwarded,
      });

    res.json({ success: true, participant });
  } catch (err) {
    next(err);
  }
};

const control = async (req, res, next) => {
  try {
    const quizId = req.params.id;
    const { action, message } = req.body;
    let session = await MonitorSession.findOne({ quiz: quizId });
    if (!session) {
      session = await MonitorSession.create({ quiz: quizId });
    }

    if (action === "pause") session.isPaused = true;
    else if (action === "resume") session.isPaused = false;
    else if (action === "end") session.isEnded = true;
    else if (action === "announce" && message)
      session.announcements.push({ message });

    session.updatedAt = new Date();
    await session.save();

    // emit control update
    const io = getIo();
    if (io)
      io.to(`quiz-${quizId}`).emit("monitor:control", {
        action,
        message,
        session,
      });

    res.json({ success: true, session });
  } catch (err) {
    next(err);
  }
};

const getMonitor = async (req, res, next) => {
  try {
    const quizId = req.params.id;
    const quiz = await Quiz.findById(quizId);
    if (!quiz) return res.status(404).json({ message: "Quiz not found" });

    const session = await MonitorSession.findOne({ quiz: quizId });
    const participants = await LiveParticipant.find({ quiz: quizId })
      .sort({ joinedAt: 1 })
      .lean();

    // Aggregate per-question stats
    const statsMap = {};
    for (const p of participants) {
      for (const a of p.answers || []) {
        const qid = String(a.question);
        statsMap[qid] = statsMap[qid] || {
          total: 0,
          correct: 0,
          wrong: 0,
          perAnswers: [],
        };
        statsMap[qid].total += 1;
        if (a.correct) statsMap[qid].correct += 1;
        else statsMap[qid].wrong += 1;
        statsMap[qid].perAnswers.push({
          participant: p._id,
          answer: a.answer,
          correct: a.correct,
        });
      }
    }

    // Populate question info
    const questionIds = Object.keys(statsMap);
    const questions = await Question.find({ _id: { $in: questionIds } }).lean();
    const stats = questions.map((q) => {
      const s = statsMap[String(q._id)] || {
        total: 0,
        correct: 0,
        wrong: 0,
        perAnswers: [],
      };
      const percentCorrect = s.total
        ? Math.round((s.correct / s.total) * 100)
        : 0;
      return {
        question: q,
        total: s.total,
        correct: s.correct,
        wrong: s.wrong,
        percentCorrect,
        perAnswers: s.perAnswers,
      };
    });

    res.json({
      success: true,
      quiz,
      session: session || null,
      participants,
      stats,
    });
  } catch (err) {
    next(err);
  }
};

export default { joinSession, submitAnswer, control, getMonitor };
