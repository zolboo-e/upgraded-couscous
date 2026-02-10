export interface ProjectSummary {
  id: string;
  name: string;
  description: string | null;
  details: string | null;
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
  details: string | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface ProjectMemberUser {
  id: string;
  email: string;
  name: string | null;
}

export interface ProjectMemberWithUser {
  id: string;
  userId: string;
  role: string | null;
  createdAt: Date;
  user: ProjectMemberUser;
}
