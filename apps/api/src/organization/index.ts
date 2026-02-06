import type { Database } from "@repo/db";
import type { MiddlewareHandler } from "hono";
import { createOrganizationHandlers } from "./handlers.js";
import { OrganizationRepository } from "./repositories/organization.repository.js";
import { createOrganizationRoutes } from "./routes.js";
import { OrganizationService } from "./services/organization.service.js";

export function createOrganizationModule(db: Database, authMiddleware: MiddlewareHandler) {
  const repository = new OrganizationRepository(db);
  const organizationService = new OrganizationService(repository);
  const handlers = createOrganizationHandlers(organizationService);
  const routes = createOrganizationRoutes(handlers, authMiddleware);

  return {
    routes,
    organizationService,
  };
}

export type OrganizationModule = ReturnType<typeof createOrganizationModule>;
