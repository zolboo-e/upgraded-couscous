import {
  companyMembers,
  type Database,
  type Project,
  projectMembers,
  projects,
  users,
} from "@repo/db";
import { and, count, eq, sql } from "drizzle-orm";
import type { ProjectMemberWithUser, ProjectSummary } from "../types/project.types.js";

export class ProjectRepository {
  constructor(private readonly db: Database) {}

  async getUserCompanyMembership(
    userId: string,
  ): Promise<{ companyId: string; role: "admin" | "member" } | null> {
    const [result] = await this.db
      .select({
        companyId: companyMembers.companyId,
        role: companyMembers.role,
      })
      .from(companyMembers)
      .where(eq(companyMembers.userId, userId))
      .limit(1);

    return result ?? null;
  }

  async findAllByCompanyId(companyId: string): Promise<ProjectSummary[]> {
    const memberCountSubquery = this.db
      .select({
        projectId: projectMembers.projectId,
        count: count().as("member_count"),
      })
      .from(projectMembers)
      .groupBy(projectMembers.projectId)
      .as("member_counts");

    const results = await this.db
      .select({
        id: projects.id,
        name: projects.name,
        description: projects.description,
        details: projects.details,
        createdAt: projects.createdAt,
        updatedAt: projects.updatedAt,
        memberCount: sql<number>`COALESCE(${memberCountSubquery.count}, 0)`.as("memberCount"),
      })
      .from(projects)
      .leftJoin(memberCountSubquery, eq(projects.id, memberCountSubquery.projectId))
      .where(eq(projects.companyId, companyId))
      .orderBy(projects.createdAt);

    return results.map((row) => ({
      id: row.id,
      name: row.name,
      description: row.description,
      details: row.details,
      memberCount: Number(row.memberCount),
      createdAt: row.createdAt,
      updatedAt: row.updatedAt,
    }));
  }

  async findByUserMembership(userId: string, companyId: string): Promise<ProjectSummary[]> {
    const memberCountSubquery = this.db
      .select({
        projectId: projectMembers.projectId,
        count: count().as("member_count"),
      })
      .from(projectMembers)
      .groupBy(projectMembers.projectId)
      .as("member_counts");

    const results = await this.db
      .select({
        id: projects.id,
        name: projects.name,
        description: projects.description,
        details: projects.details,
        createdAt: projects.createdAt,
        updatedAt: projects.updatedAt,
        memberCount: sql<number>`COALESCE(${memberCountSubquery.count}, 0)`.as("memberCount"),
      })
      .from(projects)
      .innerJoin(projectMembers, eq(projects.id, projectMembers.projectId))
      .leftJoin(memberCountSubquery, eq(projects.id, memberCountSubquery.projectId))
      .where(and(eq(projects.companyId, companyId), eq(projectMembers.userId, userId)))
      .orderBy(projects.createdAt);

    return results.map((row) => ({
      id: row.id,
      name: row.name,
      description: row.description,
      details: row.details,
      memberCount: Number(row.memberCount),
      createdAt: row.createdAt,
      updatedAt: row.updatedAt,
    }));
  }

  async create(data: {
    companyId: string;
    name: string;
    description?: string;
    details?: string;
  }): Promise<Project> {
    const [project] = await this.db
      .insert(projects)
      .values({
        companyId: data.companyId,
        name: data.name,
        description: data.description ?? null,
        details: data.details ?? null,
      })
      .returning();
    return project;
  }

  async findById(projectId: string): Promise<ProjectSummary | null> {
    const memberCountSubquery = this.db
      .select({
        projectId: projectMembers.projectId,
        count: count().as("member_count"),
      })
      .from(projectMembers)
      .groupBy(projectMembers.projectId)
      .as("member_counts");

    const [result] = await this.db
      .select({
        id: projects.id,
        name: projects.name,
        description: projects.description,
        details: projects.details,
        createdAt: projects.createdAt,
        updatedAt: projects.updatedAt,
        memberCount: sql<number>`COALESCE(${memberCountSubquery.count}, 0)`.as("memberCount"),
      })
      .from(projects)
      .leftJoin(memberCountSubquery, eq(projects.id, memberCountSubquery.projectId))
      .where(eq(projects.id, projectId))
      .limit(1);

    if (!result) {
      return null;
    }

    return {
      id: result.id,
      name: result.name,
      description: result.description,
      details: result.details,
      memberCount: Number(result.memberCount),
      createdAt: result.createdAt,
      updatedAt: result.updatedAt,
    };
  }

  async findMembersByProjectId(projectId: string): Promise<ProjectMemberWithUser[]> {
    const results = await this.db
      .select({
        id: projectMembers.id,
        userId: projectMembers.userId,
        role: projectMembers.role,
        createdAt: projectMembers.createdAt,
        user: {
          id: users.id,
          email: users.email,
          name: users.name,
        },
      })
      .from(projectMembers)
      .innerJoin(users, eq(projectMembers.userId, users.id))
      .where(eq(projectMembers.projectId, projectId))
      .orderBy(projectMembers.createdAt);

    return results;
  }

  async getProjectCompanyId(projectId: string): Promise<string | null> {
    const [result] = await this.db
      .select({ companyId: projects.companyId })
      .from(projects)
      .where(eq(projects.id, projectId))
      .limit(1);

    return result?.companyId ?? null;
  }
}
