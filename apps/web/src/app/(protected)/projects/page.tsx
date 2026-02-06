import { redirect } from "next/navigation";
import { ProjectList } from "@/components/projects/project-list";
import { ProjectsHeader } from "@/components/projects/projects-header";
import { getCurrentUserWithCompany } from "@/lib/actions/auth";
import { getProjects } from "@/lib/actions/projects";

export default async function ProjectsPage(): Promise<React.ReactElement> {
  const userData = await getCurrentUserWithCompany();

  if (!userData?.company) {
    redirect("/");
  }

  const result = await getProjects();

  if (!result) {
    redirect("/");
  }

  return (
    <main className="container mx-auto max-w-4xl px-4 py-8">
      <ProjectsHeader isAdmin={result.isAdmin} />
      <ProjectList projects={result.projects} isAdmin={result.isAdmin} />
    </main>
  );
}
