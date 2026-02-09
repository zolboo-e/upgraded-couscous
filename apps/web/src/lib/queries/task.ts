import { useQuery } from "@tanstack/react-query";
import type { TaskSummary } from "@/lib/actions/tasks";

export function taskQueryKey(projectId: string, taskId: string): readonly string[] {
  return ["task", projectId, taskId] as const;
}

export function useTask(projectId: string, taskId: string, initialData: TaskSummary): TaskSummary {
  const { data } = useQuery({
    queryKey: taskQueryKey(projectId, taskId),
    initialData,
    staleTime: Number.POSITIVE_INFINITY,
  });

  return data;
}
