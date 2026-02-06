"use client";

import { Button, Card, CardContent, CardHeader, CardTitle, Input } from "@repo/ui";
import { Check, Pencil, X } from "lucide-react";
import { useState, useTransition } from "react";
import { updateOrganization } from "@/lib/actions/organization";

interface OrganizationHeaderProps {
  name: string;
  isAdmin: boolean;
}

export function OrganizationHeader({ name, isAdmin }: OrganizationHeaderProps): React.ReactElement {
  const [isEditing, setIsEditing] = useState(false);
  const [editedName, setEditedName] = useState(name);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function handleEdit(): void {
    setEditedName(name);
    setError(null);
    setIsEditing(true);
  }

  function handleCancel(): void {
    setEditedName(name);
    setError(null);
    setIsEditing(false);
  }

  function handleSave(): void {
    if (!editedName.trim()) {
      setError("Company name is required");
      return;
    }

    startTransition(async () => {
      const result = await updateOrganization(editedName.trim());
      if (result.success) {
        setIsEditing(false);
        setError(null);
      } else {
        setError(result.error ?? "Failed to update");
      }
    });
  }

  function handleKeyDown(e: React.KeyboardEvent): void {
    if (e.key === "Enter") {
      handleSave();
    } else if (e.key === "Escape") {
      handleCancel();
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          {isEditing ? (
            <div className="flex flex-1 items-center gap-2">
              <Input
                value={editedName}
                onChange={(e) => setEditedName(e.target.value)}
                onKeyDown={handleKeyDown}
                className="max-w-md"
                autoFocus
                disabled={isPending}
              />
              <Button size="sm" variant="ghost" onClick={handleSave} disabled={isPending}>
                <Check className="h-4 w-4" />
              </Button>
              <Button size="sm" variant="ghost" onClick={handleCancel} disabled={isPending}>
                <X className="h-4 w-4" />
              </Button>
            </div>
          ) : (
            <div className="flex items-center gap-2">
              <span>{name}</span>
              {isAdmin && (
                <Button size="sm" variant="ghost" onClick={handleEdit}>
                  <Pencil className="h-4 w-4" />
                </Button>
              )}
            </div>
          )}
        </CardTitle>
        {error && <p className="text-sm text-destructive">{error}</p>}
      </CardHeader>
      <CardContent>
        <p className="text-sm text-muted-foreground">
          Manage your organization settings and team members.
        </p>
      </CardContent>
    </Card>
  );
}
