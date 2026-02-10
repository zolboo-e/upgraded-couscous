import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { ProjectList } from "@/components/projects/project-list";
import { ProjectsHeader } from "@/components/projects/projects-header";
import { getCurrentUserWithCompany } from "@/lib/actions/auth";
import { getProjects } from "@/lib/actions/projects";

export const metadata: Metadata = {
  title: "Projects",
};

export default async function ProjectsPage(): Promise<React.ReactElement> {
  const [userData, result] = await Promise.all([getCurrentUserWithCompany(), getProjects()]);

  if (!userData?.company || !result) {
    redirect("/");
  }

  return (
    <main className="container mx-auto max-w-4xl px-4 py-8">
      <ProjectsHeader isAdmin={result.isAdmin} />
      <ProjectList projects={result.projects} isAdmin={result.isAdmin} />
    </main>
  );
}
