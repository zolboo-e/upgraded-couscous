import type { Context } from "hono";
import type { OrganizationService } from "./services/organization.service.js";
import type {
  AddMemberRequest,
  UpdateMemberRequest,
  UpdateOrganizationRequest,
} from "./types/request.types.js";

export function createOrganizationHandlers(organizationService: OrganizationService) {
  return {
    getOrganization: async (c: Context) => {
      const userId = c.get("userId");
      const organization = await organizationService.getOrganization(userId);
      return c.json({ data: organization });
    },

    updateOrganization: async (c: Context) => {
      const userId = c.get("userId");
      const input = (await c.req.json()) as UpdateOrganizationRequest;
      const organization = await organizationService.updateOrganization(userId, input.name);
      return c.json({ data: organization });
    },

    addMember: async (c: Context) => {
      const userId = c.get("userId");
      const input = (await c.req.json()) as AddMemberRequest;
      const member = await organizationService.addMember(
        userId,
        input.email,
        input.name,
        input.role,
        input.password,
      );
      return c.json({ data: member }, 201);
    },

    updateMember: async (c: Context) => {
      const userId = c.get("userId");
      const memberId = c.req.param("id");
      const input = (await c.req.json()) as UpdateMemberRequest;
      const member = await organizationService.updateMemberRole(userId, memberId, input.role);
      return c.json({ data: member });
    },

    removeMember: async (c: Context) => {
      const userId = c.get("userId");
      const memberId = c.req.param("id");
      await organizationService.removeMember(userId, memberId);
      return c.json({ data: { success: true } });
    },
  };
}

export type OrganizationHandlers = ReturnType<typeof createOrganizationHandlers>;
