import { cors } from "hono/cors";

/**
 * CORS middleware for HTTP endpoints.
 * Allows cross-origin requests from any origin.
 */
export const corsMiddleware = cors();
