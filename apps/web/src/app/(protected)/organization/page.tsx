import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { MemberList } from "@/components/organization/member-list";
import { OrganizationHeader } from "@/components/organization/organization-header";
import { getCurrentUserWithCompany } from "@/lib/actions/auth";
import { getOrganization } from "@/lib/actions/organization";

export const metadata: Metadata = {
  title: "Organization",
};

export default async function OrganizationPage(): Promise<React.ReactElement> {
  const [userData, organization] = await Promise.all([
    getCurrentUserWithCompany(),
    getOrganization(),
  ]);

  if (!userData?.company || !organization) {
    redirect("/");
  }

  const isAdmin = userData.company.role === "admin";

  return (
    <main className="container mx-auto max-w-4xl px-4 py-8">
      <OrganizationHeader name={organization.name} isAdmin={isAdmin} />
      <MemberList
        members={organization.members}
        currentUserId={userData.user.id}
        isAdmin={isAdmin}
      />
    </main>
  );
}
