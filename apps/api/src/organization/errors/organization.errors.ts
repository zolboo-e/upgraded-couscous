import { AppError } from "../../shared/errors/base.error.js";

export class ForbiddenError extends AppError {
  readonly statusCode = 403;
  readonly code = "FORBIDDEN";

  constructor(message: string = "Access denied") {
    super(message);
  }
}

export class MemberNotFoundError extends AppError {
  readonly statusCode = 404;
  readonly code = "MEMBER_NOT_FOUND";

  constructor() {
    super("Member not found");
  }
}

export class UserAlreadyExistsError extends AppError {
  readonly statusCode = 409;
  readonly code = "USER_ALREADY_EXISTS";

  constructor(email: string) {
    super(`User with email '${email}' already exists`);
  }
}

export class CannotRemoveLastAdminError extends AppError {
  readonly statusCode = 400;
  readonly code = "CANNOT_REMOVE_LAST_ADMIN";

  constructor() {
    super("Cannot remove the last admin from the organization");
  }
}

export class CannotRemoveSelfError extends AppError {
  readonly statusCode = 400;
  readonly code = "CANNOT_REMOVE_SELF";

  constructor() {
    super("Cannot remove yourself from the organization");
  }
}

export class CompanyNotFoundError extends AppError {
  readonly statusCode = 404;
  readonly code = "COMPANY_NOT_FOUND";

  constructor() {
    super("Company not found");
  }
}
