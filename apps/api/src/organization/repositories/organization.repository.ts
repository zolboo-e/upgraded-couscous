import {
  type Company,
  type CompanyMember,
  companies,
  companyMembers,
  type Database,
  type NewCompanyMember,
  type NewUser,
  type User,
  users,
} from "@repo/db";
import { and, count, eq } from "drizzle-orm";
import type { OrganizationMember } from "../types/organization.types.js";

export class OrganizationRepository {
  constructor(private readonly db: Database) {}

  async findCompanyById(companyId: string): Promise<Company | null> {
    const [company] = await this.db
      .select()
      .from(companies)
      .where(eq(companies.id, companyId))
      .limit(1);
    return company ?? null;
  }

  async findCompanyByUserId(userId: string): Promise<Company | null> {
    const [result] = await this.db
      .select({ company: companies })
      .from(companyMembers)
      .innerJoin(companies, eq(companyMembers.companyId, companies.id))
      .where(eq(companyMembers.userId, userId))
      .limit(1);
    return result?.company ?? null;
  }

  async findUserMembership(
    userId: string,
  ): Promise<{ company: Company; role: "admin" | "member"; memberId: string } | null> {
    const [result] = await this.db
      .select({
        company: companies,
        role: companyMembers.role,
        memberId: companyMembers.id,
      })
      .from(companyMembers)
      .innerJoin(companies, eq(companyMembers.companyId, companies.id))
      .where(eq(companyMembers.userId, userId))
      .limit(1);
    return result ?? null;
  }

  async updateCompany(companyId: string, data: { name: string }): Promise<Company> {
    const [company] = await this.db
      .update(companies)
      .set({ name: data.name, updatedAt: new Date() })
      .where(eq(companies.id, companyId))
      .returning();
    return company;
  }

  async findCompanyMembers(companyId: string): Promise<OrganizationMember[]> {
    const results = await this.db
      .select({
        id: companyMembers.id,
        userId: companyMembers.userId,
        role: companyMembers.role,
        createdAt: companyMembers.createdAt,
        user: {
          id: users.id,
          email: users.email,
          name: users.name,
        },
      })
      .from(companyMembers)
      .innerJoin(users, eq(companyMembers.userId, users.id))
      .where(eq(companyMembers.companyId, companyId))
      .orderBy(companyMembers.createdAt);

    return results;
  }

  async findUserByEmail(email: string): Promise<User | null> {
    const [user] = await this.db
      .select()
      .from(users)
      .where(eq(users.email, email.toLowerCase()))
      .limit(1);
    return user ?? null;
  }

  async createUser(data: NewUser): Promise<User> {
    const [user] = await this.db.insert(users).values(data).returning();
    return user;
  }

  async findMemberById(memberId: string): Promise<CompanyMember | null> {
    const [member] = await this.db
      .select()
      .from(companyMembers)
      .where(eq(companyMembers.id, memberId))
      .limit(1);
    return member ?? null;
  }

  async findMemberByIdWithUser(memberId: string): Promise<(CompanyMember & { user: User }) | null> {
    const [result] = await this.db
      .select({
        id: companyMembers.id,
        companyId: companyMembers.companyId,
        userId: companyMembers.userId,
        role: companyMembers.role,
        createdAt: companyMembers.createdAt,
        user: users,
      })
      .from(companyMembers)
      .innerJoin(users, eq(companyMembers.userId, users.id))
      .where(eq(companyMembers.id, memberId))
      .limit(1);

    if (!result) return null;

    return {
      id: result.id,
      companyId: result.companyId,
      userId: result.userId,
      role: result.role,
      createdAt: result.createdAt,
      user: result.user,
    };
  }

  async createMember(data: NewCompanyMember): Promise<CompanyMember> {
    const [member] = await this.db.insert(companyMembers).values(data).returning();
    return member;
  }

  async updateMemberRole(
    memberId: string,
    role: "admin" | "member",
  ): Promise<CompanyMember | null> {
    const [member] = await this.db
      .update(companyMembers)
      .set({ role })
      .where(eq(companyMembers.id, memberId))
      .returning();
    return member ?? null;
  }

  async deleteMember(memberId: string): Promise<void> {
    await this.db.delete(companyMembers).where(eq(companyMembers.id, memberId));
  }

  async countAdmins(companyId: string): Promise<number> {
    const [result] = await this.db
      .select({ count: count() })
      .from(companyMembers)
      .where(and(eq(companyMembers.companyId, companyId), eq(companyMembers.role, "admin")));
    return result?.count ?? 0;
  }
}
