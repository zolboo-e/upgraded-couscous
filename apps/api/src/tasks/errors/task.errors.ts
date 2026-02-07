import { AppError } from "../../shared/errors/base.error.js";

export class TaskNotFoundError extends AppError {
  readonly statusCode = 404;
  readonly code = "TASK_NOT_FOUND";

  constructor() {
    super("Task not found");
  }
}

export class TaskAccessDeniedError extends AppError {
  readonly statusCode = 403;
  readonly code = "TASK_ACCESS_DENIED";

  constructor() {
    super("You do not have access to this task");
  }
}
