const errorHandler = (err, req, res, next) => {
  let error = { ...err };
  error.message = err.message;

  // Log error
  console.log(err);

  // Mongoose bad ObjectId
  if (err.name === "CastError") {
    const message = "Resource not found";
    error = { message, statusCode: 404 };
  }

  // Mongoose duplicate key
  if (err.code === 11000) {
    // err.keyValue contains the fields that caused the duplicate
    const keyValue = err.keyValue || {};
    const keys = Object.keys(keyValue);
    let message = "Duplicate field value entered";
    if (keys.includes("email")) {
      message = "This email already has an account";
    } else if (keys.includes("identifier") && keys.includes("institution")) {
      message = "This ID already has an account for this institution";
    } else if (keys.includes("identifier")) {
      message = "This ID is already registered";
    }
    // err.keyValue contains the fields that caused the duplicate for modern drivers
    // Prefer explicit keyValue detection
    error = { message, statusCode: 400 };

    // Prefer explicit keyValue detection
    if (keys.includes("email")) {
      message = "This email already has an account";
    } else if (keys.includes("identifier") && keys.includes("institution")) {
      message = "This ID already has an account for this institution";
    } else if (keys.includes("identifier")) {
      // Could be a leftover single-field duplicate; check index name as a fallback
      if (err.message && /identifier.*institution/i.test(err.message)) {
        message = "This ID already has an account for this institution";
      } else {
        message = "This ID is already registered";
      }
    } else if (err.message) {
      // Fallback: inspect the index name in the error message for compound index
      const msg = err.message.toLowerCase();
      if (msg.includes("identifier_1") && msg.includes("institution_1")) {
        message = "This ID already has an account for this institution";
      } else if (msg.includes("email_1")) {
        message = "This email already has an account";
      }
    }

    error = { message, statusCode: 400 };
  }

  // Mongoose validation error
  if (err.name === "ValidationError") {
    const message = Object.values(err.errors)
      .map((val) => val.message)
      .join(", ");
    error = { message, statusCode: 400 };
  }

  res.status(error.statusCode || 500).json({
    success: false,
    message: error.message || "Server Error",
  });
};

export default errorHandler;
