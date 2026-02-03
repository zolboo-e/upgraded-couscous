import type { Context, Next } from "hono";
import { env } from "../config/env.js";
import { AppError } from "../shared/errors/base.error.js";

const SERVICE_TOKEN_HEADER = "X-Service-Token";

export class InvalidServiceTokenError extends AppError {
  readonly statusCode = 401;
  readonly code = "INVALID_SERVICE_TOKEN";

  constructor() {
    super("Invalid or missing service token");
  }
}

export async function internalAuthMiddleware(c: Context, next: Next): Promise<void> {
  const token = c.req.header(SERVICE_TOKEN_HEADER);

  if (!env.INTERNAL_API_TOKEN) {
    throw new InvalidServiceTokenError();
  }

  if (!token || token !== env.INTERNAL_API_TOKEN) {
    throw new InvalidServiceTokenError();
  }

  await next();
}
