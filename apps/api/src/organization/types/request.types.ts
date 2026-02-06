import { z } from "zod";

export const updateOrganizationSchema = z.object({
  name: z.string().min(1, "Company name is required").max(255),
});

export const addMemberSchema = z.object({
  email: z.string().email("Invalid email address").max(255),
  name: z.string().max(255).optional(),
  role: z.enum(["admin", "member"]).default("member"),
});

export const updateMemberSchema = z.object({
  role: z.enum(["admin", "member"]),
});

export const memberIdParamSchema = z.object({
  id: z.string().uuid("Invalid member ID"),
});

export type UpdateOrganizationRequest = z.infer<typeof updateOrganizationSchema>;
export type AddMemberRequest = z.infer<typeof addMemberSchema>;
export type UpdateMemberRequest = z.infer<typeof updateMemberSchema>;
