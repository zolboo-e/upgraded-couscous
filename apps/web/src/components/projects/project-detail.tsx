"use client";

import {
  Card,
  CardDescription,
  CardHeader,
  CardTitle,
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@repo/ui";
import { ArrowLeft, FolderOpen } from "lucide-react";
import Link from "next/link";
import type { ProjectMember, ProjectSummary } from "@/lib/actions/projects";
import { ProjectInfoTab } from "./project-info-tab";
import { TasksTabPlaceholder } from "./tasks-tab-placeholder";

interface ProjectDetailProps {
  project: ProjectSummary;
  members: ProjectMember[];
}

export function ProjectDetail({ project, members }: ProjectDetailProps): React.ReactElement {
  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Link
          href="/projects"
          className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to Projects
        </Link>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-2xl">
            <FolderOpen className="h-6 w-6" />
            {project.name}
          </CardTitle>
          {project.description && (
            <CardDescription className="text-base">{project.description}</CardDescription>
          )}
        </CardHeader>
      </Card>

      <Tabs defaultValue="info">
        <TabsList>
          <TabsTrigger value="info">Project Info</TabsTrigger>
          <TabsTrigger value="tasks">Tasks</TabsTrigger>
        </TabsList>

        <TabsContent value="info" className="mt-6">
          <ProjectInfoTab project={project} members={members} />
        </TabsContent>

        <TabsContent value="tasks" className="mt-6">
          <TasksTabPlaceholder />
        </TabsContent>
      </Tabs>
    </div>
  );
}
