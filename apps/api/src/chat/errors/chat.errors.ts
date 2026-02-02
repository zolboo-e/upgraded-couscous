import { AppError } from "../../shared/errors/base.error.js";

export class SessionNotFoundError extends AppError {
  readonly statusCode = 404;
  readonly code = "SESSION_NOT_FOUND";

  constructor(sessionId: string) {
    super(`Session with ID '${sessionId}' not found`);
  }
}

export class UnauthorizedAccessError extends AppError {
  readonly statusCode = 403;
  readonly code = "UNAUTHORIZED_ACCESS";

  constructor(resource: string, resourceId: string) {
    super(`You do not have access to ${resource} '${resourceId}'`);
  }
}

export class ValidationError extends AppError {
  readonly statusCode = 400;
  readonly code = "VALIDATION_ERROR";

  constructor(
    message: string,
    readonly details?: unknown,
  ) {
    super(message);
  }

  toJSON() {
    return {
      error: {
        code: this.code,
        message: this.message,
        details: this.details,
      },
    };
  }
}
