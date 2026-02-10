import { Card, CardDescription, CardHeader, CardTitle } from "@repo/ui";
import { ArrowLeft, FolderOpen } from "lucide-react";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ProjectTabNavigation } from "@/components/projects/project-tab-navigation";
import { getCachedProjectById } from "@/lib/actions/cached";

interface ProjectChromeLayoutProps {
  children: React.ReactNode;
  params: Promise<{ id: string }>;
}

export default async function ProjectChromeLayout({
  children,
  params,
}: ProjectChromeLayoutProps): Promise<React.ReactElement> {
  const { id } = await params;

  const project = await getCachedProjectById(id);
  if (!project) {
    notFound();
  }

  return (
    <>
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
    </>
  );
}
