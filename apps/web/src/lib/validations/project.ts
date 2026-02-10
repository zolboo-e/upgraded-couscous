import { z } from "zod";

export const createProjectSchema = z.object({
  name: z
    .string()
    .min(1, "Project name is required")
    .max(255, "Name must be at most 255 characters"),
  description: z.string().max(1000, "Description must be at most 1000 characters").optional(),
  details: z.string().optional(),
});

export type CreateProjectFormData = z.infer<typeof createProjectSchema>;
