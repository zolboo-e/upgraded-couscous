"use server";

import { parseResponse } from "hono/client";
import { revalidatePath } from "next/cache";
import { api } from "../api/client";

export interface ProjectSummary {
  id: string;
  name: string;
  description: string | null;
  memberCount: number;
  createdAt: string;
  updatedAt: string;
}

export interface ProjectsListResult {
  projects: ProjectSummary[];
  isAdmin: boolean;
}

export async function getProjects(): Promise<ProjectsListResult | null> {
  try {
    const result = await parseResponse(api.projects.$get());
    return result.data;
  } catch {
    return null;
  }
}

export interface ActionResult {
  success: boolean;
  error?: string;
}

export async function createProject(name: string, description?: string): Promise<ActionResult> {
  try {
    await parseResponse(api.projects.$post({ json: { name, description } }));
    revalidatePath("/projects");
    return { success: true };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to create project",
    };
  }
}

export async function getProjectById(projectId: string): Promise<ProjectSummary | null> {
  try {
    const result = await parseResponse(api.projects[":id"].$get({ param: { id: projectId } }));
    return result.data;
  } catch {
    return null;
  }
}

export interface ProjectMemberUser {
  id: string;
  email: string;
  name: string | null;
}

export interface ProjectMember {
  id: string;
  userId: string;
  role: string | null;
  createdAt: string;
  user: ProjectMemberUser;
}

export interface ProjectMembersResult {
  members: ProjectMember[];
}

export async function getProjectMembers(projectId: string): Promise<ProjectMembersResult | null> {
  try {
    const result = await parseResponse(
      api.projects[":id"].members.$get({ param: { id: projectId } }),
    );
    return result.data;
  } catch {
    return null;
  }
}
