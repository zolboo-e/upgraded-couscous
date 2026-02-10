"use server";

import { cache } from "react";
import { getCurrentUserWithCompany } from "./auth";
import { getProjectById, getProjectMembers } from "./projects";

/**
 * Per-request cached versions of frequently-called server actions.
 * Use these in layouts and pages to avoid duplicate fetches within the same request.
 */
export const getCachedProjectById = cache(getProjectById);
export const getCachedProjectMembers = cache(getProjectMembers);
export const getCachedUserWithCompany = cache(getCurrentUserWithCompany);
