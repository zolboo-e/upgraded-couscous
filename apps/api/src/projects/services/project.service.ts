import { NoCompanyMembershipError } from "../errors/project.errors.js";
import type { ProjectRepository } from "../repositories/project.repository.js";
import type { ProjectsListResponse } from "../types/project.types.js";

export class ProjectService {
  constructor(private readonly repository: ProjectRepository) {}

  async getProjects(userId: string): Promise<ProjectsListResponse> {
    const membership = await this.repository.getUserCompanyMembership(userId);

    if (!membership) {
      throw new NoCompanyMembershipError();
    }

    const isAdmin = membership.role === "admin";

    const projects = isAdmin
      ? await this.repository.findAllByCompanyId(membership.companyId)
      : await this.repository.findByUserMembership(userId, membership.companyId);

    return {
      projects,
      isAdmin,
    };
  }
}
