import { z } from "zod";

export const createProjectSchema = z.object({
  name: z
    .string()
    .min(1, "Project name is required")
    .max(255, "Project name must be at most 255 characters"),
  description: z.string().max(1000, "Description must be at most 1000 characters").optional(),
});

export type CreateProjectRequest = z.infer<typeof createProjectSchema>;
