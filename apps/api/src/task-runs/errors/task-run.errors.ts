import { AppError } from "../../shared/errors/base.error.js";

export class TaskRunNotFoundError extends AppError {
  readonly statusCode = 404;
  readonly code = "TASK_RUN_NOT_FOUND";

  constructor() {
    super("Task run not found");
  }
}

export class ProjectRepoNotConfiguredError extends AppError {
  readonly statusCode = 400;
  readonly code = "PROJECT_REPO_NOT_CONFIGURED";

  constructor() {
    super("Project repository URL and GitHub token must be configured before running tasks");
  }
}

export class TaskRunTriggerError extends AppError {
  readonly statusCode = 502;
  readonly code = "TASK_RUN_TRIGGER_FAILED";
}
