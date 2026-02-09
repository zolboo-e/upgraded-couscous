import { redirect } from "next/navigation";
import { getCurrentUserWithCompany } from "@/lib/actions/auth";

interface ProjectLayoutProps {
  children: React.ReactNode;
}

export default async function ProjectLayout({
  children,
}: ProjectLayoutProps): Promise<React.ReactElement> {
  const userData = await getCurrentUserWithCompany();
  if (!userData?.company) {
    redirect("/");
  }

  return (
    <div className="container mx-auto max-w-6xl px-4 py-8">
      <div className="space-y-6">{children}</div>
    </div>
  );
}
