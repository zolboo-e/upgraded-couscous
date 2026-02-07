"use client";

import { Tabs, TabsList, TabsTrigger } from "@repo/ui";
import { usePathname, useRouter } from "next/navigation";

interface ProjectTabNavigationProps {
  projectId: string;
}

export function ProjectTabNavigation({ projectId }: ProjectTabNavigationProps): React.ReactElement {
  const pathname = usePathname();
  const router = useRouter();

  const currentTab = pathname.endsWith("/info") ? "info" : "tasks";

  function handleTabChange(value: string): void {
    const path = value === "info" ? `/projects/${projectId}/info` : `/projects/${projectId}`;
    router.push(path);
  }

  return (
    <Tabs value={currentTab} onValueChange={handleTabChange}>
      <TabsList>
        <TabsTrigger value="tasks">Tasks</TabsTrigger>
        <TabsTrigger value="info">Project Info</TabsTrigger>
      </TabsList>
    </Tabs>
  );
}
