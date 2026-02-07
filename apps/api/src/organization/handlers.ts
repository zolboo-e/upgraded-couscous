import { sValidator } from "@hono/standard-validator";
import { factory } from "../shared/factory.js";
import type { OrganizationService } from "./services/organization.service.js";
import {
  addMemberSchema,
  memberIdParamSchema,
  updateMemberSchema,
  updateOrganizationSchema,
} from "./types/request.types.js";

export function createOrganizationHandlers(organizationService: OrganizationService) {
  return {
    getOrganization: factory.createHandlers(async (c) => {
      const userId = c.get("userId");
      const organization = await organizationService.getOrganization(userId);
      return c.json({ data: organization });
    }),

    updateOrganization: factory.createHandlers(
      sValidator("json", updateOrganizationSchema),
      async (c) => {
        const userId = c.get("userId");
        const input = c.req.valid("json");
        const organization = await organizationService.updateOrganization(userId, input.name);
        return c.json({ data: organization });
      },
    ),

    addMember: factory.createHandlers(sValidator("json", addMemberSchema), async (c) => {
      const userId = c.get("userId");
      const input = c.req.valid("json");
      const member = await organizationService.addMember(
        userId,
        input.email,
        input.name,
        input.role,
        input.password,
      );
      return c.json({ data: member }, 201);
    }),

    updateMember: factory.createHandlers(
      sValidator("param", memberIdParamSchema),
      sValidator("json", updateMemberSchema),
      async (c) => {
        const userId = c.get("userId");
        const { id: memberId } = c.req.valid("param");
        const input = c.req.valid("json");
        const member = await organizationService.updateMemberRole(userId, memberId, input.role);
        return c.json({ data: member });
      },
    ),

    removeMember: factory.createHandlers(sValidator("param", memberIdParamSchema), async (c) => {
      const userId = c.get("userId");
      const { id: memberId } = c.req.valid("param");
      await organizationService.removeMember(userId, memberId);
      return c.json({ data: { success: true } });
    }),
  };
}

export type OrganizationHandlers = ReturnType<typeof createOrganizationHandlers>;
