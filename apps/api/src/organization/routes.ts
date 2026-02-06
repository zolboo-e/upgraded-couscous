import { sValidator } from "@hono/standard-validator";
import { Hono, type MiddlewareHandler } from "hono";
import type { OrganizationHandlers } from "./handlers.js";
import {
  addMemberSchema,
  memberIdParamSchema,
  updateMemberSchema,
  updateOrganizationSchema,
} from "./types/request.types.js";

export function createOrganizationRoutes(
  handlers: OrganizationHandlers,
  authMiddleware: MiddlewareHandler,
) {
  return new Hono()
    .use("*", authMiddleware)
    .get("/", handlers.getOrganization)
    .patch("/", sValidator("json", updateOrganizationSchema), handlers.updateOrganization)
    .post("/members", sValidator("json", addMemberSchema), handlers.addMember)
    .patch(
      "/members/:id",
      sValidator("param", memberIdParamSchema),
      sValidator("json", updateMemberSchema),
      handlers.updateMember,
    )
    .delete("/members/:id", sValidator("param", memberIdParamSchema), handlers.removeMember);
}
