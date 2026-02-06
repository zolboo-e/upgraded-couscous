import { Card, CardContent } from "@repo/ui";
import { FolderOpen } from "lucide-react";

interface ProjectsEmptyStateProps {
  isAdmin: boolean;
}

export function ProjectsEmptyState({ isAdmin }: ProjectsEmptyStateProps): React.ReactElement {
  return (
    <Card className="mt-6">
      <CardContent className="flex flex-col items-center justify-center py-12">
        <FolderOpen className="h-12 w-12 text-muted-foreground/50" />
        <h3 className="mt-4 text-lg font-semibold">No projects found</h3>
        <p className="mt-2 text-center text-sm text-muted-foreground">
          {isAdmin
            ? "Create your first project to get started."
            : "You haven't been assigned to any projects yet. Contact an admin to be added to a project."}
        </p>
      </CardContent>
    </Card>
  );
}
