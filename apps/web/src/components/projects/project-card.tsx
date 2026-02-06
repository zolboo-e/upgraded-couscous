import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@repo/ui";
import { FolderOpen, Users } from "lucide-react";
import Link from "next/link";
import type { ProjectSummary } from "@/lib/actions/projects";

interface ProjectCardProps {
  project: ProjectSummary;
}

export function ProjectCard({ project }: ProjectCardProps): React.ReactElement {
  return (
    <Link href={`/projects/${project.id}`}>
      <Card className="transition-colors hover:border-primary/50">
        <CardHeader className="pb-2">
          <CardTitle className="flex items-center gap-2 text-lg">
            <FolderOpen className="h-5 w-5" />
            {project.name}
          </CardTitle>
          {project.description && (
            <CardDescription className="line-clamp-2">{project.description}</CardDescription>
          )}
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-1 text-sm text-muted-foreground">
            <Users className="h-4 w-4" />
            <span>
              {project.memberCount} member{project.memberCount !== 1 ? "s" : ""}
            </span>
          </div>
        </CardContent>
      </Card>
    </Link>
  );
}
