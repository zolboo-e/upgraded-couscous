import type { Context } from "hono";
import type { ProjectService } from "./services/project.service.js";

export function createProjectHandlers(projectService: ProjectService) {
  return {
    getProjects: async (c: Context) => {
      const userId = c.get("userId");
      const result = await projectService.getProjects(userId);
      return c.json({ data: result });
    },
  };
}

export type ProjectHandlers = ReturnType<typeof createProjectHandlers>;
