import { hashPassword } from "../../auth/utils/password.js";
import {
  CannotRemoveLastAdminError,
  CannotRemoveSelfError,
  CompanyNotFoundError,
  ForbiddenError,
  MemberNotFoundError,
  UserAlreadyExistsError,
} from "../errors/organization.errors.js";
import type { OrganizationRepository } from "../repositories/organization.repository.js";
import type { OrganizationDetails, OrganizationMember } from "../types/organization.types.js";

export class OrganizationService {
  constructor(private readonly repository: OrganizationRepository) {}

  async getOrganization(userId: string): Promise<OrganizationDetails> {
    const membership = await this.repository.findUserMembership(userId);
    if (!membership) {
      throw new CompanyNotFoundError();
    }

    const members = await this.repository.findCompanyMembers(membership.company.id);

    return {
      id: membership.company.id,
      name: membership.company.name,
      members,
      createdAt: membership.company.createdAt,
      updatedAt: membership.company.updatedAt,
    };
  }

  async updateOrganization(userId: string, name: string): Promise<OrganizationDetails> {
    const membership = await this.repository.findUserMembership(userId);
    if (!membership) {
      throw new CompanyNotFoundError();
    }

    if (membership.role !== "admin") {
      throw new ForbiddenError("Only admins can update organization details");
    }

    await this.repository.updateCompany(membership.company.id, { name });

    return this.getOrganization(userId);
  }

  async addMember(
    userId: string,
    email: string,
    name: string | undefined,
    role: "admin" | "member",
    password: string,
  ): Promise<OrganizationMember> {
    const membership = await this.repository.findUserMembership(userId);
    if (!membership) {
      throw new CompanyNotFoundError();
    }

    if (membership.role !== "admin") {
      throw new ForbiddenError("Only admins can add members");
    }

    const existingUser = await this.repository.findUserByEmail(email);
    if (existingUser) {
      throw new UserAlreadyExistsError(email);
    }

    const passwordHash = await hashPassword(password);

    const newUser = await this.repository.createUser({
      email: email.toLowerCase(),
      name: name ?? null,
      passwordHash,
    });

    const member = await this.repository.createMember({
      companyId: membership.company.id,
      userId: newUser.id,
      role,
    });

    return {
      id: member.id,
      userId: newUser.id,
      role: member.role,
      user: {
        id: newUser.id,
        email: newUser.email,
        name: newUser.name,
      },
      createdAt: member.createdAt,
    };
  }

  async updateMemberRole(
    userId: string,
    memberId: string,
    role: "admin" | "member",
  ): Promise<OrganizationMember> {
    const membership = await this.repository.findUserMembership(userId);
    if (!membership) {
      throw new CompanyNotFoundError();
    }

    if (membership.role !== "admin") {
      throw new ForbiddenError("Only admins can change member roles");
    }

    const member = await this.repository.findMemberByIdWithUser(memberId);
    if (!member || member.companyId !== membership.company.id) {
      throw new MemberNotFoundError();
    }

    if (member.role === "admin" && role === "member") {
      const adminCount = await this.repository.countAdmins(membership.company.id);
      if (adminCount <= 1) {
        throw new CannotRemoveLastAdminError();
      }
    }

    const updated = await this.repository.updateMemberRole(memberId, role);
    if (!updated) {
      throw new MemberNotFoundError();
    }

    return {
      id: updated.id,
      userId: updated.userId,
      role: updated.role,
      user: {
        id: member.user.id,
        email: member.user.email,
        name: member.user.name,
      },
      createdAt: updated.createdAt,
    };
  }

  async removeMember(userId: string, memberId: string): Promise<void> {
    const membership = await this.repository.findUserMembership(userId);
    if (!membership) {
      throw new CompanyNotFoundError();
    }

    if (membership.role !== "admin") {
      throw new ForbiddenError("Only admins can remove members");
    }

    const member = await this.repository.findMemberById(memberId);
    if (!member || member.companyId !== membership.company.id) {
      throw new MemberNotFoundError();
    }

    if (member.userId === userId) {
      throw new CannotRemoveSelfError();
    }

    if (member.role === "admin") {
      const adminCount = await this.repository.countAdmins(membership.company.id);
      if (adminCount <= 1) {
        throw new CannotRemoveLastAdminError();
      }
    }

    await this.repository.deleteMember(memberId);
  }

  async getUserMembership(
    userId: string,
  ): Promise<{ companyId: string; role: "admin" | "member" } | null> {
    const membership = await this.repository.findUserMembership(userId);
    if (!membership) {
      return null;
    }

    return {
      companyId: membership.company.id,
      role: membership.role,
    };
  }
}
