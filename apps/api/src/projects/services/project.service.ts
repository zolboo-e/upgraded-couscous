import type { ProjectMeta } from "@repo/db";
import type { ChatRepository } from "../../chat/repositories/chat.repository.js";
import {
  ForbiddenError,
  NoCompanyMembershipError,
  ProjectNotFoundError,
} from "../errors/project.errors.js";
import type { ProjectRepository } from "../repositories/project.repository.js";
import type {
  CreatedProject,
  ProjectMemberWithUser,
  ProjectSummary,
  ProjectsListResponse,
} from "../types/project.types.js";

export class ProjectService {
  constructor(
    private readonly repository: ProjectRepository,
    private readonly chatRepository: ChatRepository,
  ) {}

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

  async createProject(
    userId: string,
    name: string,
    description?: string,
    details?: string,
  ): Promise<CreatedProject> {
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
      details,
    });

    const session = await this.chatRepository.createSession({
      userId,
      title: name,
    });
    await this.chatRepository.linkSessionToProject(session.id, project.id);

    return {
      id: project.id,
      name: project.name,
      description: project.description,
      details: project.details,
      createdAt: project.createdAt,
      updatedAt: project.updatedAt,
    };
  }

  async getProjectById(userId: string, projectId: string): Promise<ProjectSummary> {
    const membership = await this.repository.getUserCompanyMembership(userId);

    if (!membership) {
      throw new NoCompanyMembershipError();
    }

    const projectCompanyId = await this.repository.getProjectCompanyId(projectId);

    if (!projectCompanyId) {
      throw new ProjectNotFoundError();
    }

    if (projectCompanyId !== membership.companyId) {
      throw new ForbiddenError("You do not have access to this project");
    }

    const project = await this.repository.findById(projectId);

    if (!project) {
      throw new ProjectNotFoundError();
    }

    return project;
  }

  async getProjectMembers(userId: string, projectId: string): Promise<ProjectMemberWithUser[]> {
    const membership = await this.repository.getUserCompanyMembership(userId);

    if (!membership) {
      throw new NoCompanyMembershipError();
    }

    const projectCompanyId = await this.repository.getProjectCompanyId(projectId);

    if (!projectCompanyId) {
      throw new ProjectNotFoundError();
    }

    if (projectCompanyId !== membership.companyId) {
      throw new ForbiddenError("You do not have access to this project");
    }

    return this.repository.findMembersByProjectId(projectId);
  }

  async updateProject(
    userId: string,
    projectId: string,
    data: {
      name?: string;
      description?: string | null;
      details?: string | null;
      meta?: { repoUrl?: string; defaultBranch?: string; githubToken?: string };
    },
  ): Promise<ProjectSummary> {
    const membership = await this.repository.getUserCompanyMembership(userId);

    if (!membership) {
      throw new NoCompanyMembershipError();
    }

    if (membership.role !== "admin") {
      throw new ForbiddenError("Only admins can update projects");
    }

    const existing = await this.repository.findByIdRaw(projectId);
    if (!existing) {
      throw new ProjectNotFoundError();
    }

    if (existing.companyId !== membership.companyId) {
      throw new ForbiddenError("You do not have access to this project");
    }

    const mergedMeta: ProjectMeta | undefined = data.meta
      ? { ...((existing.meta as ProjectMeta) ?? {}), ...data.meta }
      : undefined;

    await this.repository.update(projectId, {
      name: data.name,
      description: data.description,
      details: data.details,
      meta: mergedMeta,
    });

    const updated = await this.repository.findById(projectId);
    if (!updated) {
      throw new ProjectNotFoundError();
    }

    return updated;
  }
}
