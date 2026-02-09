import { notFound } from "next/navigation";
import { KanbanBoard } from "@/components/tasks/kanban-board";
import { getProjectById } from "@/lib/actions/projects";
import { getProjectTasks } from "@/lib/actions/tasks";

interface ProjectPageProps {
  params: Promise<{ id: string }>;
}

export default async function ProjectPage({
  params,
}: ProjectPageProps): Promise<React.ReactElement> {
  const { id } = await params;

  const [project, tasksResult] = await Promise.all([getProjectById(id), getProjectTasks(id)]);

  if (!project) {
    notFound();
  }

  const tasks = tasksResult?.tasks ?? [];

  return <KanbanBoard projectId={id} tasks={tasks} />;
}
