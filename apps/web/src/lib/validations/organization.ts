import { z } from "zod";

export const roleSchema = z.enum(["admin", "member"]);

export const addMemberSchema = z.object({
  email: z.string().email("Invalid email address").max(255),
  name: z.string().max(255).optional(),
  password: z.string().min(8, "Password must be at least 8 characters"),
  role: roleSchema,
});

export const editMemberSchema = z.object({
  role: roleSchema,
});

export type AddMemberFormData = z.infer<typeof addMemberSchema>;
export type EditMemberFormData = z.infer<typeof editMemberSchema>;
