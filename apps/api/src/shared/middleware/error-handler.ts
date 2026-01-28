import type { Context, Next } from "hono";
import { AppError } from "../errors/base.error.js";

export async function errorHandler(c: Context, next: Next): Promise<Response> {
  try {
    await next();
  } catch (error) {
    if (error instanceof AppError) {
      return c.json(error.toJSON(), error.statusCode as 400 | 403 | 404 | 500 | 502);
    }

    console.error("Unexpected error:", error);

    return c.json(
      {
        error: {
          code: "INTERNAL_SERVER_ERROR",
          message: "An unexpected error occurred",
        },
      },
      500,
    );
  }

  return c.res;
}
