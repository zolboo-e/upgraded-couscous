"use server";

import { parseResponse } from "hono/client";
import { revalidatePath } from "next/cache";
import { api } from "../api/client";

export interface OrganizationMember {
  id: string;
  userId: string;
  role: "admin" | "member";
  user: {
    id: string;
    email: string;
    name: string | null;
  };
  createdAt: string;
}

export interface Organization {
  id: string;
  name: string;
  members: OrganizationMember[];
  createdAt: string;
  updatedAt: string;
}

export interface ActionResult {
  success: boolean;
  error?: string;
}

export async function getOrganization(): Promise<Organization | null> {
  try {
    const result = await parseResponse(api.organization.$get());
    return result.data;
  } catch {
    return null;
  }
}

export async function updateOrganization(name: string): Promise<ActionResult> {
  try {
    await parseResponse(api.organization.$patch({ json: { name } }));
    revalidatePath("/organization");
    return { success: true };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to update organization",
    };
  }
}

export async function addMember(
  email: string,
  name: string | undefined,
  role: "admin" | "member",
  password: string,
): Promise<ActionResult> {
  try {
    await parseResponse(api.organization.members.$post({ json: { email, name, role, password } }));
    revalidatePath("/organization");
    return { success: true };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to add member",
    };
  }
}

export async function updateMemberRole(
  memberId: string,
  role: "admin" | "member",
): Promise<ActionResult> {
  try {
    // Type assertion needed due to Hono RPC not merging multiple validator types
    await parseResponse(
      api.organization.members[":id"].$patch({
        param: { id: memberId },
        json: { role },
      } as { param: { id: string }; json: { role: "admin" | "member" } }),
    );
    revalidatePath("/organization");
    return { success: true };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to update member role",
    };
  }
}

export async function removeMember(memberId: string): Promise<ActionResult> {
  try {
    await parseResponse(
      api.organization.members[":id"].$delete({
        param: { id: memberId },
      }),
    );
    revalidatePath("/organization");
    return { success: true };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to remove member",
    };
  }
}
