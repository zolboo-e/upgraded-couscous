import { Button } from "@repo/ui";
import Link from "next/link";
import { getCurrentUserWithCompany } from "@/lib/actions/auth";
import { UserMenu } from "./user-menu";

export async function Header(): Promise<React.ReactElement> {
  const userData = await getCurrentUserWithCompany();

  return (
    <header className="border-b bg-background">
      <div className="container mx-auto flex h-16 items-center justify-between px-4">
        <Link href="/" className="text-xl font-bold">
          Upgraded Couscous
        </Link>

        <nav className="flex items-center gap-4">
          {userData ? (
            <div className="flex items-center gap-4">
              <Link href="/chats" className="text-sm hover:text-primary">
                Chats
              </Link>
              <UserMenu user={userData.user} company={userData.company} />
            </div>
          ) : (
            <div className="flex items-center gap-2">
              <Button variant="ghost" asChild>
                <Link href="/login">Sign in</Link>
              </Button>
              <Button asChild>
                <Link href="/register">Sign up</Link>
              </Button>
            </div>
          )}
        </nav>
      </div>
    </header>
  );
}
