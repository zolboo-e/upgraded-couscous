import type { Context, Next } from "hono";
import { ForbiddenError } from "../errors/organization.errors.js";
import type { OrganizationService } from "../services/organization.service.js";

export function createAdminMiddleware(organizationService: OrganizationService) {
  return async function adminMiddleware(c: Context, next: Next): Promise<void> {
    const userId = c.get("userId");

    const membership = await organizationService.getUserMembership(userId);
    if (!membership) {
      throw new ForbiddenError("You are not a member of any organization");
    }

    if (membership.role !== "admin") {
      throw new ForbiddenError("Admin access required");
    }

    c.set("companyId", membership.companyId);
    c.set("isAdmin", true);

    await next();
  };
}
