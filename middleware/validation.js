import { body, validationResult } from "express-validator";

// Handle validation errors
export const handleValidationErrors = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({
      success: false,
      errors: errors.array(),
    });
  }
  next();
};

// User validation rules
export const validateUser = [
  body("id").trim().isLength({ min: 1 }).withMessage("ID is required"),
  body("email").isEmail().withMessage("A valid email is required"),
  body("password")
    .isLength({ min: 6 })
    .withMessage("Password must be at least 6 characters long"),
  body("institution")
    .trim()
    .isLength({ min: 1 })
    .withMessage("Institution is required"),
  body("role")
    .trim()
    .isIn(["student", "teacher"])
    .withMessage("Role must be either 'student' or 'teacher'"),
  handleValidationErrors,
];

// Post validation rules
export const validatePost = [
  body("title")
    .trim()
    .isLength({ min: 5, max: 100 })
    .withMessage("Title must be between 5 and 100 characters"),
  body("content")
    .trim()
    .isLength({ min: 10 })
    .withMessage("Content must be at least 10 characters long"),
  handleValidationErrors,
];
