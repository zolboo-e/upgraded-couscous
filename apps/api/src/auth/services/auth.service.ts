import { EmailAlreadyExistsError, InvalidCredentialsError } from "../errors/auth.errors.js";
import type { AuthRepository } from "../repositories/auth.repository.js";
import type {
  AuthenticatedUser,
  AuthResult,
  LoginInput,
  RegisterInput,
} from "../types/auth.types.js";
import { generateJWT, verifyJWT } from "../utils/jwt.js";
import { hashPassword, verifyPassword } from "../utils/password.js";

export class AuthService {
  constructor(private readonly repository: AuthRepository) {}

  async register(input: RegisterInput): Promise<AuthResult> {
    const existingUser = await this.repository.findUserByEmail(input.email);
    if (existingUser) {
      throw new EmailAlreadyExistsError(input.email);
    }

    const passwordHash = await hashPassword(input.password);

    const company = await this.repository.createCompany({
      name: input.companyName,
    });

    const user = await this.repository.createUser({
      email: input.email.toLowerCase(),
      name: input.name ?? null,
      passwordHash,
    });

    await this.repository.createCompanyMember({
      companyId: company.id,
      userId: user.id,
      role: "admin",
    });

    return this.createTokenForUser(user.id, user.email, user.name);
  }

  async login(input: LoginInput): Promise<AuthResult> {
    const user = await this.repository.findUserByEmail(input.email);
    if (!user || !user.passwordHash) {
      throw new InvalidCredentialsError();
    }

    const isValid = await verifyPassword(input.password, user.passwordHash);
    if (!isValid) {
      throw new InvalidCredentialsError();
    }

    return this.createTokenForUser(user.id, user.email, user.name);
  }

  async validateSession(token: string): Promise<AuthenticatedUser | null> {
    const payload = await verifyJWT(token);
    if (!payload) {
      return null;
    }

    return {
      id: payload.userId,
      email: payload.email,
      name: payload.name,
    };
  }

  async getCurrentUser(userId: string): Promise<AuthenticatedUser | null> {
    const user = await this.repository.findUserById(userId);
    if (!user) {
      return null;
    }

    return {
      id: user.id,
      email: user.email,
      name: user.name,
    };
  }

  async getCurrentUserWithCompany(userId: string): Promise<{
    user: AuthenticatedUser;
    company: { id: string; name: string; role: "admin" | "member" } | null;
  } | null> {
    const user = await this.repository.findUserById(userId);
    if (!user) {
      return null;
    }

    const companyData = await this.repository.findUserCompany(userId);

    return {
      user: { id: user.id, email: user.email, name: user.name },
      company: companyData
        ? { id: companyData.company.id, name: companyData.company.name, role: companyData.role }
        : null,
    };
  }

  private async createTokenForUser(
    userId: string,
    email: string,
    name: string | null,
  ): Promise<AuthResult> {
    const { token, expiresAt } = await generateJWT({ userId, email, name });

    return {
      user: { id: userId, email, name },
      sessionToken: token,
      expiresAt,
    };
  }
}
