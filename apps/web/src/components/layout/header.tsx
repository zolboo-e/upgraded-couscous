import { Button } from "@repo/ui";
import Link from "next/link";
import { LogoutButton } from "@/components/auth/logout-button";
import { getCurrentUser } from "@/lib/actions/auth";

export async function Header(): Promise<React.ReactElement> {
  const user = await getCurrentUser();

  return (
    <header className="border-b bg-background">
      <div className="container mx-auto flex h-16 items-center justify-between px-4">
        <Link href="/" className="text-xl font-bold">
          Upgraded Couscous
        </Link>

        <nav className="flex items-center gap-4">
          {user ? (
            <div className="flex items-center gap-4">
              <Link href="/chats" className="text-sm hover:text-primary">
                Chats
              </Link>
              <span className="text-sm text-muted-foreground">{user.name ?? user.email}</span>
              <LogoutButton />
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
