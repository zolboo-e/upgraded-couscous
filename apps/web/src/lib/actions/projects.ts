"use server";

import { parseResponse } from "hono/client";
import { revalidatePath } from "next/cache";
import { api } from "../api/client";

export interface ProjectMetaResponse {
  repoUrl?: string;
  defaultBranch?: string;
  hasGithubToken?: boolean;
}

export interface ProjectSummary {
  id: string;
  name: string;
  description: string | null;
  details: string | null;
  meta?: ProjectMetaResponse;
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

import type { ActionResult } from "../types";

export async function createProject(
  name: string,
  description?: string,
  details?: string,
): Promise<ActionResult> {
  try {
    await parseResponse(api.projects.$post({ json: { name, description, details } }));
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

export interface UpdateProjectInput {
  name?: string;
  description?: string | null;
  details?: string | null;
  meta?: {
    repoUrl?: string;
    defaultBranch?: string;
    githubToken?: string;
  };
}

export async function updateProject(
  projectId: string,
  input: UpdateProjectInput,
): Promise<ActionResult> {
  try {
    await parseResponse(api.projects[":id"].$patch({ param: { id: projectId }, json: input }));
    revalidatePath(`/projects/${projectId}`);
    return { success: true };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to update project",
    };
  }
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
