import { notFound } from "next/navigation";
import { ProjectInfoTab } from "@/components/projects/project-info-tab";
import { getProjectById, getProjectMembers } from "@/lib/actions/projects";

interface InfoPageProps {
  params: Promise<{ id: string }>;
}

export default async function InfoPage({ params }: InfoPageProps): Promise<React.ReactElement> {
  const { id } = await params;

  const [project, membersResult] = await Promise.all([getProjectById(id), getProjectMembers(id)]);

  if (!project) {
    notFound();
  }

  const members = membersResult?.members ?? [];

  return <ProjectInfoTab project={project} members={members} />;
}
