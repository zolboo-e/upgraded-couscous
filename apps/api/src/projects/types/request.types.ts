import { z } from "zod";

export const createProjectSchema = z.object({
  name: z
    .string()
    .min(1, "Project name is required")
    .max(255, "Project name must be at most 255 characters"),
  description: z.string().max(1000, "Description must be at most 1000 characters").optional(),
  details: z.string().optional(),
});

export const updateProjectSchema = z.object({
  name: z.string().min(1).max(255).optional(),
  description: z.string().max(1000).nullable().optional(),
  details: z.string().nullable().optional(),
  meta: z
    .object({
      repoUrl: z.string().url().optional(),
      defaultBranch: z.string().optional(),
      githubToken: z.string().optional(),
    })
    .optional(),
});

export const projectIdParamSchema = z.object({
  id: z.string().uuid("Invalid project ID"),
});

export type CreateProjectRequest = z.infer<typeof createProjectSchema>;
export type UpdateProjectRequest = z.infer<typeof updateProjectSchema>;
export type ProjectIdParam = z.infer<typeof projectIdParamSchema>;
