"use client";

import { Button, Card, CardContent, CardHeader, CardTitle } from "@repo/ui";
import { FolderPlus } from "lucide-react";
import { useState } from "react";
import { CreateProjectDialog } from "./create-project-dialog";

interface ProjectsHeaderProps {
  isAdmin: boolean;
}

export function ProjectsHeader({ isAdmin }: ProjectsHeaderProps): React.ReactElement {
  const [dialogOpen, setDialogOpen] = useState(false);

  return (
    <>
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>Projects</CardTitle>
          {isAdmin && (
            <Button size="sm" onClick={() => setDialogOpen(true)}>
              <FolderPlus className="mr-2 h-4 w-4" />
              New Project
            </Button>
          )}
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">
            {isAdmin
              ? "View and manage all company projects."
              : "View projects you are assigned to."}
          </p>
        </CardContent>
      </Card>
      {isAdmin && <CreateProjectDialog open={dialogOpen} onOpenChange={setDialogOpen} />}
    </>
  );
}
