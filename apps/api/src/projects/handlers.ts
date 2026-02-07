import type { Context } from "hono";
import type { ProjectService } from "./services/project.service.js";
import type { CreateProjectRequest } from "./types/request.types.js";

export function createProjectHandlers(projectService: ProjectService) {
  return {
    getProjects: async (c: Context) => {
      const userId = c.get("userId");
      const result = await projectService.getProjects(userId);
      return c.json({ data: result });
    },

    createProject: async (c: Context) => {
      const userId = c.get("userId");
      const input = (await c.req.json()) as CreateProjectRequest;
      const result = await projectService.createProject(userId, input.name, input.description);
      return c.json({ data: result }, 201);
    },
  };
}

export type ProjectHandlers = ReturnType<typeof createProjectHandlers>;
