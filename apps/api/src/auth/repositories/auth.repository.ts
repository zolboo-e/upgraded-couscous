import {
  type Company,
  type CompanyMember,
  companies,
  companyMembers,
  type Database,
  type NewCompany,
  type NewCompanyMember,
  type NewUser,
  type User,
  users,
} from "@repo/db";
import { eq } from "drizzle-orm";

export class AuthRepository {
  constructor(private readonly db: Database) {}

  async createUser(data: NewUser): Promise<User> {
    const [user] = await this.db.insert(users).values(data).returning();
    return user;
  }

  async findUserByEmail(email: string): Promise<User | null> {
    const [user] = await this.db
      .select()
      .from(users)
      .where(eq(users.email, email.toLowerCase()))
      .limit(1);
    return user ?? null;
  }

  async findUserById(id: string): Promise<User | null> {
    const [user] = await this.db.select().from(users).where(eq(users.id, id)).limit(1);
    return user ?? null;
  }

  async createCompany(data: NewCompany): Promise<Company> {
    const [company] = await this.db.insert(companies).values(data).returning();
    return company;
  }

  async createCompanyMember(data: NewCompanyMember): Promise<CompanyMember> {
    const [member] = await this.db.insert(companyMembers).values(data).returning();
    return member;
  }

  async findUserCompany(
    userId: string,
  ): Promise<{ company: Company; role: "admin" | "member" } | null> {
    const [result] = await this.db
      .select({
        company: companies,
        role: companyMembers.role,
      })
      .from(companyMembers)
      .innerJoin(companies, eq(companyMembers.companyId, companies.id))
      .where(eq(companyMembers.userId, userId))
      .limit(1);
    return result ?? null;
  }
}
