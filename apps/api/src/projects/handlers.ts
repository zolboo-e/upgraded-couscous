import { sValidator } from "@hono/standard-validator";
import { factory } from "../shared/factory.js";
import type { ProjectService } from "./services/project.service.js";
import {
  createProjectSchema,
  projectIdParamSchema,
  updateProjectSchema,
} from "./types/request.types.js";

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
      const result = await projectService.createProject(
        userId,
        input.name,
        input.description,
        input.details,
      );
      return c.json({ data: result }, 201);
    }),

    getProjectById: factory.createHandlers(sValidator("param", projectIdParamSchema), async (c) => {
      const userId = c.get("userId");
      const { id: projectId } = c.req.valid("param");
      const result = await projectService.getProjectById(userId, projectId);
      return c.json({ data: result });
    }),

    getProjectMembers: factory.createHandlers(
      sValidator("param", projectIdParamSchema),
      async (c) => {
        const userId = c.get("userId");
        const { id: projectId } = c.req.valid("param");
        const result = await projectService.getProjectMembers(userId, projectId);
        return c.json({ data: { members: result } });
      },
    ),

    updateProject: factory.createHandlers(
      sValidator("param", projectIdParamSchema),
      sValidator("json", updateProjectSchema),
      async (c) => {
        const userId = c.get("userId");
        const { id: projectId } = c.req.valid("param");
        const input = c.req.valid("json");
        const result = await projectService.updateProject(userId, projectId, input);
        return c.json({ data: result });
      },
    ),
  };
}

export type ProjectHandlers = ReturnType<typeof createProjectHandlers>;
