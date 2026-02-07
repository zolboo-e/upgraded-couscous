import { Card, CardDescription, CardHeader, CardTitle } from "@repo/ui";
import { ArrowLeft, FolderOpen } from "lucide-react";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { ProjectTabNavigation } from "@/components/projects/project-tab-navigation";
import { getCurrentUserWithCompany } from "@/lib/actions/auth";
import { getProjectById } from "@/lib/actions/projects";

interface ProjectLayoutProps {
  children: React.ReactNode;
  params: Promise<{ id: string }>;
}

export default async function ProjectLayout({
  children,
  params,
}: ProjectLayoutProps): Promise<React.ReactElement> {
  const { id } = await params;

  const userData = await getCurrentUserWithCompany();
  if (!userData?.company) {
    redirect("/");
  }

  const project = await getProjectById(id);
  if (!project) {
    notFound();
  }

  return (
    <main className="container mx-auto max-w-6xl px-4 py-8">
      <div className="space-y-6">
        <div className="flex items-center gap-4">
          <Link
            href="/projects"
            className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to Projects
          </Link>
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-2xl">
              <FolderOpen className="h-6 w-6" />
              {project.name}
            </CardTitle>
            {project.description && (
              <CardDescription className="text-base">{project.description}</CardDescription>
            )}
          </CardHeader>
        </Card>

        <ProjectTabNavigation projectId={id} />

        <div className="mt-6">{children}</div>
      </div>
    </main>
  );
}
