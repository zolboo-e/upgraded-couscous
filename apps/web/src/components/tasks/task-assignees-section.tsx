"use client";

import { Avatar, AvatarFallback, Button, Card, CardContent, CardHeader, CardTitle } from "@repo/ui";
import { UserPlus, X } from "lucide-react";
import { useState } from "react";
import type { ProjectMember } from "@/lib/actions/projects";
import { removeTaskAssignee, type TaskAssignee } from "@/lib/actions/task-assignees";
import { AddAssigneeDialog } from "./add-assignee-dialog";

interface TaskAssigneesSectionProps {
  projectId: string;
  taskId: string;
  assignees: TaskAssignee[];
  projectMembers: ProjectMember[];
}

function getInitials(name: string | null, email: string): string {
  if (name) {
    return name
      .split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase()
      .slice(0, 2);
  }
  return email[0].toUpperCase();
}

export function TaskAssigneesSection({
  projectId,
  taskId,
  assignees,
  projectMembers,
}: TaskAssigneesSectionProps): React.ReactElement {
  const [addDialogOpen, setAddDialogOpen] = useState(false);
  const [removingUserId, setRemovingUserId] = useState<string | null>(null);

  async function handleRemove(userId: string): Promise<void> {
    setRemovingUserId(userId);
    await removeTaskAssignee(projectId, taskId, userId);
    setRemovingUserId(null);
  }

  const assignedUserIds = new Set(assignees.map((a) => a.userId));
  const availableMembers = projectMembers.filter((m) => !assignedUserIds.has(m.userId));

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg">Assignees</CardTitle>
          <Button size="sm" variant="outline" onClick={() => setAddDialogOpen(true)}>
            <UserPlus className="mr-1 h-4 w-4" />
            Add
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        {assignees.length === 0 ? (
          <p className="text-sm text-muted-foreground">No assignees yet.</p>
        ) : (
          <div className="space-y-3">
            {assignees.map((assignee) => (
              <div key={assignee.id} className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <Avatar className="h-8 w-8">
                    <AvatarFallback className="text-xs">
                      {getInitials(assignee.userName, assignee.userEmail)}
                    </AvatarFallback>
                  </Avatar>
                  <div>
                    <p className="text-sm font-medium">{assignee.userName ?? assignee.userEmail}</p>
                    {assignee.userName && (
                      <p className="text-xs text-muted-foreground">{assignee.userEmail}</p>
                    )}
                  </div>
                </div>
                <Button
                  size="icon"
                  variant="ghost"
                  className="h-8 w-8"
                  onClick={() => handleRemove(assignee.userId)}
                  disabled={removingUserId === assignee.userId}
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
            ))}
          </div>
        )}
      </CardContent>

      <AddAssigneeDialog
        projectId={projectId}
        taskId={taskId}
        availableMembers={availableMembers}
        open={addDialogOpen}
        onOpenChange={setAddDialogOpen}
      />
    </Card>
  );
}
