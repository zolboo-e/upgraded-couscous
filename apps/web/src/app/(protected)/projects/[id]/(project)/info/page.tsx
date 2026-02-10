import { notFound } from "next/navigation";
import { ProjectInfoTab } from "@/components/projects/project-info-tab";
import { getCachedProjectById, getCachedProjectMembers } from "@/lib/actions/cached";

interface InfoPageProps {
  params: Promise<{ id: string }>;
}

export default async function InfoPage({ params }: InfoPageProps): Promise<React.ReactElement> {
  const { id } = await params;

  const [project, membersResult] = await Promise.all([
    getCachedProjectById(id),
    getCachedProjectMembers(id),
  ]);

  if (!project) {
    notFound();
  }

  const members = membersResult?.members ?? [];

  return <ProjectInfoTab project={project} members={members} />;
}
