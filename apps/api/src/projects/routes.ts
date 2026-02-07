import { sValidator } from "@hono/standard-validator";
import { Hono, type MiddlewareHandler } from "hono";
import type { ProjectHandlers } from "./handlers.js";
import { createProjectSchema } from "./types/request.types.js";

export function createProjectRoutes(handlers: ProjectHandlers, authMiddleware: MiddlewareHandler) {
  return new Hono()
    .use("*", authMiddleware)
    .get("/", handlers.getProjects)
    .post("/", sValidator("json", createProjectSchema), handlers.createProject);
}
