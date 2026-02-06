import { Hono, type MiddlewareHandler } from "hono";
import type { ProjectHandlers } from "./handlers.js";

export function createProjectRoutes(handlers: ProjectHandlers, authMiddleware: MiddlewareHandler) {
  return new Hono().use("*", authMiddleware).get("/", handlers.getProjects);
}
