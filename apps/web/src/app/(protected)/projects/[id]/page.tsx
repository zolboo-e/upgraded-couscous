import { notFound, redirect } from "next/navigation";
import { ProjectDetail } from "@/components/projects/project-detail";
import { getCurrentUserWithCompany } from "@/lib/actions/auth";
import { getProjectById, getProjectMembers } from "@/lib/actions/projects";
import { getProjectTasks } from "@/lib/actions/tasks";

interface ProjectPageProps {
  params: Promise<{ id: string }>;
}

export default async function ProjectPage({
  params,
}: ProjectPageProps): Promise<React.ReactElement> {
  const { id } = await params;

  const userData = await getCurrentUserWithCompany();
  if (!userData?.company) {
    redirect("/");
  }

  const [project, membersResult, tasksResult] = await Promise.all([
    getProjectById(id),
    getProjectMembers(id),
    getProjectTasks(id),
  ]);

  if (!project) {
    notFound();
  }

  const members = membersResult?.members ?? [];
  const tasks = tasksResult?.tasks ?? [];

  return (
    <main className="container mx-auto max-w-6xl px-4 py-8">
      <ProjectDetail project={project} members={members} tasks={tasks} />
    </main>
  );
}
