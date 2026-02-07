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

export class ForbiddenError extends AppError {
  readonly statusCode = 403;
  readonly code = "FORBIDDEN";

  constructor(message: string = "You do not have permission to perform this action") {
    super(message);
  }
}
