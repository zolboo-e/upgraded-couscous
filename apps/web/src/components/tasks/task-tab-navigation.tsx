"use client";

import { Tabs, TabsList, TabsTrigger } from "@repo/ui";
import { usePathname, useRouter } from "next/navigation";

interface TaskTabNavigationProps {
  projectId: string;
  taskId: string;
}

export function TaskTabNavigation({
  projectId,
  taskId,
}: TaskTabNavigationProps): React.ReactElement {
  const pathname = usePathname();
  const router = useRouter();

  const currentTab = pathname.endsWith("/info") ? "info" : "chat";

  function handleTabChange(value: string): void {
    const basePath = `/projects/${projectId}/tasks/${taskId}`;
    const path = value === "info" ? `${basePath}/info` : basePath;
    router.push(path);
  }

  return (
    <Tabs value={currentTab} onValueChange={handleTabChange}>
      <TabsList>
        <TabsTrigger value="chat">Chat</TabsTrigger>
        <TabsTrigger value="info">Task Info</TabsTrigger>
      </TabsList>
    </Tabs>
  );
}
