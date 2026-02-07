import { sValidator } from "@hono/standard-validator";
import { factory } from "../shared/factory.js";
import type { ProjectService } from "./services/project.service.js";
import { createProjectSchema } from "./types/request.types.js";

export function createProjectHandlers(projectService: ProjectService) {
  return {
    getProjects: factory.createHandlers(async (c) => {
      const userId = c.get("userId");
      const result = await projectService.getProjects(userId);
      return c.json({ data: result });
    }),

    createProject: factory.createHandlers(sValidator("json", createProjectSchema), async (c) => {
      const userId = c.get("userId");
      const input = c.req.valid("json");
      const result = await projectService.createProject(userId, input.name, input.description);
      return c.json({ data: result }, 201);
    }),
  };
}

export type ProjectHandlers = ReturnType<typeof createProjectHandlers>;
