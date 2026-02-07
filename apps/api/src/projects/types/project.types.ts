export interface ProjectSummary {
  id: string;
  name: string;
  description: string | null;
  memberCount: number;
  createdAt: Date;
  updatedAt: Date;
}

export interface ProjectsListResponse {
  projects: ProjectSummary[];
  isAdmin: boolean;
}

export interface CreatedProject {
  id: string;
  name: string;
  description: string | null;
  createdAt: Date;
  updatedAt: Date;
}
