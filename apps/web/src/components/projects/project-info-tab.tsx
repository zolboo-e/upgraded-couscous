import { Card, CardContent, CardHeader, CardTitle } from "@repo/ui";
import { Calendar, FileText, Users } from "lucide-react";
import Markdown from "react-markdown";
import type { ProjectMember, ProjectSummary } from "@/lib/actions/projects";
import { ProjectMembersSection } from "./project-members-section";

interface ProjectInfoTabProps {
  project: ProjectSummary;
  members: ProjectMember[];
}

function formatDate(dateString: string): string {
  return new Date(dateString).toLocaleDateString("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });
}

export function ProjectInfoTab({ project, members }: ProjectInfoTabProps): React.ReactElement {
  return (
    <div className="grid gap-6 md:grid-cols-2">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <Calendar className="h-5 w-5" />
            Project Details
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <p className="text-sm text-muted-foreground">Created</p>
            <p className="font-medium">{formatDate(project.createdAt)}</p>
          </div>
          <div>
            <p className="text-sm text-muted-foreground">Last Updated</p>
            <p className="font-medium">{formatDate(project.updatedAt)}</p>
          </div>
          <div>
            <p className="text-sm text-muted-foreground">Total Members</p>
            <p className="font-medium">{project.memberCount}</p>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <Users className="h-5 w-5" />
            Team Members
          </CardTitle>
        </CardHeader>
        <CardContent>
          <ProjectMembersSection members={members} />
        </CardContent>
      </Card>

      {project.details && (
        <Card className="md:col-span-2">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg">
              <FileText className="h-5 w-5" />
              Details
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="prose prose-sm dark:prose-invert max-w-none">
              <Markdown>{project.details}</Markdown>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
