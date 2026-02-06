"use server";

import { parseResponse } from "hono/client";
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
