import { AppError } from "../../shared/errors/base.error.js";

export class ProjectNotFoundError extends AppError {
  readonly statusCode = 404;
  readonly code = "PROJECT_NOT_FOUND";

  constructor() {
    super("Project not found");
  }
}

export class NoCompanyMembershipError extends AppError {
  readonly statusCode = 403;
  readonly code = "NO_COMPANY_MEMBERSHIP";

  constructor() {
    super("You are not a member of any company");
  }
}
