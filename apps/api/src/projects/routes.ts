import type { MiddlewareHandler } from "hono";
import { factory } from "../shared/factory.js";
import type { ProjectHandlers } from "./handlers.js";

export function createProjectRoutes(handlers: ProjectHandlers, authMiddleware: MiddlewareHandler) {
  return factory
    .createApp()
    .use("*", authMiddleware)
    .get("/", ...handlers.getProjects)
    .post("/", ...handlers.createProject)
    .get("/:id", ...handlers.getProjectById)
    .patch("/:id", ...handlers.updateProject)
    .get("/:id/members", ...handlers.getProjectMembers);
}
