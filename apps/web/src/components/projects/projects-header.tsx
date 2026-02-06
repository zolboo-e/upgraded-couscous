"use client";

import { Button, Card, CardContent, CardHeader, CardTitle } from "@repo/ui";
import { FolderPlus } from "lucide-react";

interface ProjectsHeaderProps {
  isAdmin: boolean;
}

export function ProjectsHeader({ isAdmin }: ProjectsHeaderProps): React.ReactElement {
  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle>Projects</CardTitle>
        {isAdmin && (
          <Button size="sm" disabled>
            <FolderPlus className="mr-2 h-4 w-4" />
            New Project
          </Button>
        )}
      </CardHeader>
      <CardContent>
        <p className="text-sm text-muted-foreground">
          {isAdmin ? "View and manage all company projects." : "View projects you are assigned to."}
        </p>
      </CardContent>
    </Card>
  );
}
