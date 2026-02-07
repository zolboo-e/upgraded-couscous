import { ForbiddenError, NoCompanyMembershipError } from "../errors/project.errors.js";
import type { ProjectRepository } from "../repositories/project.repository.js";
import type { CreatedProject, ProjectsListResponse } from "../types/project.types.js";

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

  async createProject(userId: string, name: string, description?: string): Promise<CreatedProject> {
    const membership = await this.repository.getUserCompanyMembership(userId);

    if (!membership) {
      throw new NoCompanyMembershipError();
    }

    if (membership.role !== "admin") {
      throw new ForbiddenError("Only admins can create projects");
    }

    const project = await this.repository.create({
      companyId: membership.companyId,
      name,
      description,
    });

    return {
      id: project.id,
      name: project.name,
      description: project.description,
      createdAt: project.createdAt,
      updatedAt: project.updatedAt,
    };
  }
}
