"use client";

import type { ProjectSummary } from "@/lib/actions/projects";
import { ProjectCard } from "./project-card";
import { ProjectsEmptyState } from "./projects-empty-state";

interface ProjectListProps {
  projects: ProjectSummary[];
  isAdmin: boolean;
}

export function ProjectList({ projects, isAdmin }: ProjectListProps): React.ReactElement {
  if (projects.length === 0) {
    return <ProjectsEmptyState isAdmin={isAdmin} />;
  }

  return (
    <div className="mt-6 grid gap-4 md:grid-cols-2">
      {projects.map((project) => (
        <ProjectCard key={project.id} project={project} />
      ))}
    </div>
  );
}
