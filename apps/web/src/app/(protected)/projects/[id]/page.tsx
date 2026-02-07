import { notFound, redirect } from "next/navigation";
import { ProjectDetail } from "@/components/projects/project-detail";
import { getCurrentUserWithCompany } from "@/lib/actions/auth";
import { getProjectById, getProjectMembers } from "@/lib/actions/projects";

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

  const [project, membersResult] = await Promise.all([getProjectById(id), getProjectMembers(id)]);

  if (!project) {
    notFound();
  }

  const members = membersResult?.members ?? [];

  return (
    <main className="container mx-auto max-w-6xl px-4 py-8">
      <ProjectDetail project={project} members={members} />
    </main>
  );
}
