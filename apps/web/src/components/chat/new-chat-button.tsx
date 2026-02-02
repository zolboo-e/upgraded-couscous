"use client";

import { Button, type ButtonProps } from "@repo/ui";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { createChatSession } from "@/lib/api/chat";

type NewChatButtonProps = Omit<ButtonProps, "onClick" | "disabled">;

export function NewChatButton({
  children = "New Chat",
  ...props
}: NewChatButtonProps): React.ReactElement {
  const router = useRouter();
  const [isCreating, setIsCreating] = useState(false);

  const handleCreate = async (): Promise<void> => {
    setIsCreating(true);
    try {
      const session = await createChatSession();
      router.push(`/chats/${session.id}`);
    } catch (error) {
      setIsCreating(false);
      throw error;
    }
  };

  return (
    <Button onClick={handleCreate} disabled={isCreating} {...props}>
      {isCreating ? "Creating..." : children}
    </Button>
  );
}
