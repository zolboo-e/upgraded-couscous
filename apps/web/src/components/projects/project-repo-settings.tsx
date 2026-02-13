"use client";

import { Button, Card, CardContent, CardHeader, CardTitle, Input, Label } from "@repo/ui";
import { useForm } from "@tanstack/react-form";
import { GitBranch, Save } from "lucide-react";
import { useState } from "react";
import { type ProjectMetaResponse, updateProject } from "@/lib/actions/projects";

interface ProjectRepoSettingsProps {
  projectId: string;
  meta?: ProjectMetaResponse;
}

export function ProjectRepoSettings({
  projectId,
  meta,
}: ProjectRepoSettingsProps): React.ReactElement {
  const [serverError, setServerError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const form = useForm({
    defaultValues: {
      repoUrl: meta?.repoUrl ?? "",
      defaultBranch: meta?.defaultBranch ?? "main",
      githubToken: "",
    },
    onSubmit: async ({ value }) => {
      setServerError(null);
      setSuccess(false);

      const metaUpdate: Record<string, string> = {};
      if (value.repoUrl.trim()) {
        metaUpdate.repoUrl = value.repoUrl.trim();
      }
      if (value.defaultBranch.trim()) {
        metaUpdate.defaultBranch = value.defaultBranch.trim();
      }
      if (value.githubToken.trim()) {
        metaUpdate.githubToken = value.githubToken.trim();
      }

      const result = await updateProject(projectId, { meta: metaUpdate });
      if (result.success) {
        setSuccess(true);
        form.setFieldValue("githubToken", "");
      } else {
        setServerError(result.error ?? "Failed to save");
      }
    },
  });

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-lg">
          <GitBranch className="h-5 w-5" />
          Repository Settings
        </CardTitle>
      </CardHeader>
      <CardContent>
        <form
          onSubmit={(e) => {
            e.preventDefault();
            e.stopPropagation();
            form.handleSubmit();
          }}
        >
          <div className="grid gap-4">
            <form.Field name="repoUrl">
              {(field) => (
                <div className="grid gap-2">
                  <Label htmlFor={field.name}>Repository URL</Label>
                  <Input
                    id={field.name}
                    placeholder="https://github.com/org/repo"
                    value={field.state.value}
                    onChange={(e) => field.handleChange(e.target.value)}
                  />
                </div>
              )}
            </form.Field>

            <form.Field name="defaultBranch">
              {(field) => (
                <div className="grid gap-2">
                  <Label htmlFor={field.name}>Default Branch</Label>
                  <Input
                    id={field.name}
                    placeholder="main"
                    value={field.state.value}
                    onChange={(e) => field.handleChange(e.target.value)}
                  />
                </div>
              )}
            </form.Field>

            <form.Field name="githubToken">
              {(field) => (
                <div className="grid gap-2">
                  <Label htmlFor={field.name}>GitHub Token (PAT)</Label>
                  <Input
                    id={field.name}
                    type="password"
                    placeholder={
                      meta?.hasGithubToken ? "Token saved - enter new to update" : "ghp_..."
                    }
                    value={field.state.value}
                    onChange={(e) => field.handleChange(e.target.value)}
                  />
                </div>
              )}
            </form.Field>

            {serverError && <p className="text-sm text-destructive">{serverError}</p>}
            {success && <p className="text-sm text-green-600">Settings saved successfully</p>}

            <form.Subscribe selector={(state) => state.isSubmitting}>
              {(isSubmitting) => (
                <Button type="submit" size="sm" disabled={isSubmitting}>
                  <Save className="mr-1 h-4 w-4" />
                  {isSubmitting ? "Saving..." : "Save Repository Settings"}
                </Button>
              )}
            </form.Subscribe>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
