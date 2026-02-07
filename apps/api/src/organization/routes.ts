import type { MiddlewareHandler } from "hono";
import { factory } from "../shared/factory.js";
import type { OrganizationHandlers } from "./handlers.js";

export function createOrganizationRoutes(
  handlers: OrganizationHandlers,
  authMiddleware: MiddlewareHandler,
) {
  return factory
    .createApp()
    .use("*", authMiddleware)
    .get("/", ...handlers.getOrganization)
    .patch("/", ...handlers.updateOrganization)
    .post("/members", ...handlers.addMember)
    .patch("/members/:id", ...handlers.updateMember)
    .delete("/members/:id", ...handlers.removeMember);
}
