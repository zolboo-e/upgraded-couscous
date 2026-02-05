"use client";

import { Button, type ButtonProps } from "@repo/ui";
import { useTransition } from "react";
import { logout } from "@/lib/actions/auth";

type LogoutButtonProps = Omit<ButtonProps, "onClick" | "disabled">;

export function LogoutButton({
  variant = "ghost",
  size = "default",
  className,
  ...props
}: LogoutButtonProps): React.ReactElement {
  const [isPending, startTransition] = useTransition();

  const handleLogout = (): void => {
    startTransition(async () => {
      await logout();
    });
  };

  return (
    <Button
      variant={variant}
      size={size}
      className={className}
      onClick={handleLogout}
      disabled={isPending}
      {...props}
    >
      {isPending ? "Signing out..." : "Sign out"}
    </Button>
  );
}
