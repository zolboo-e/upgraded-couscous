import { AppError } from "../../shared/errors/base.error.js";

export class SandboxConnectionError extends AppError {
  readonly statusCode = 503;
  readonly code = "SANDBOX_CONNECTION_ERROR";

  constructor(message: string) {
    super(`Sandbox connection failed: ${message}`);
  }
}

export class SandboxTimeoutError extends AppError {
  readonly statusCode = 504;
  readonly code = "SANDBOX_TIMEOUT";

  constructor(message = "Sandbox operation timed out") {
    super(message);
  }
}

export class SandboxNotConfiguredError extends AppError {
  readonly statusCode = 503;
  readonly code = "SANDBOX_NOT_CONFIGURED";

  constructor() {
    super("Sandbox is not configured. Set SANDBOX_WS_URL and SANDBOX_API_TOKEN.");
  }
}
