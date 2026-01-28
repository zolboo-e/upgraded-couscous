"use client";

import { Button, type ButtonProps } from "@repo/ui";
import { useState } from "react";
import { useAuth } from "@/contexts/auth-context";

type LogoutButtonProps = Omit<ButtonProps, "onClick" | "disabled">;

export function LogoutButton({
  variant = "ghost",
  size = "default",
  className,
  ...props
}: LogoutButtonProps): React.ReactElement {
  const { logout } = useAuth();
  const [isLoggingOut, setIsLoggingOut] = useState(false);

  const handleLogout = async (): Promise<void> => {
    setIsLoggingOut(true);
    try {
      await logout();
    } finally {
      setIsLoggingOut(false);
    }
  };

  return (
    <Button
      variant={variant}
      size={size}
      className={className}
      onClick={handleLogout}
      disabled={isLoggingOut}
      {...props}
    >
      {isLoggingOut ? "Signing out..." : "Sign out"}
    </Button>
  );
}
