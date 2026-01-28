import { AppError } from "../../shared/errors/base.error.js";

export class InvalidCredentialsError extends AppError {
  readonly statusCode = 401;
  readonly code = "INVALID_CREDENTIALS";

  constructor() {
    super("Invalid email or password");
  }
}

export class EmailAlreadyExistsError extends AppError {
  readonly statusCode = 409;
  readonly code = "EMAIL_ALREADY_EXISTS";

  constructor(email: string) {
    super(`User with email '${email}' already exists`);
  }
}

export class SessionExpiredError extends AppError {
  readonly statusCode = 401;
  readonly code = "SESSION_EXPIRED";

  constructor() {
    super("Your session has expired. Please log in again.");
  }
}

export class InvalidSessionError extends AppError {
  readonly statusCode = 401;
  readonly code = "INVALID_SESSION";

  constructor() {
    super("Invalid or missing authentication");
  }
}

export class WeakPasswordError extends AppError {
  readonly statusCode = 400;
  readonly code = "WEAK_PASSWORD";

  constructor(reason: string) {
    super(`Password does not meet requirements: ${reason}`);
  }
}
