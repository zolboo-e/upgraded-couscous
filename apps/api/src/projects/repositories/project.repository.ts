import { companyMembers, type Database, projectMembers, projects } from "@repo/db";
import { and, count, eq, sql } from "drizzle-orm";
import type { ProjectSummary } from "../types/project.types.js";

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
      memberCount: Number(row.memberCount),
      createdAt: row.createdAt,
      updatedAt: row.updatedAt,
    }));
  }
}
