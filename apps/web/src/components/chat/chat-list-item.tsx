"use client";

import { Button, Card, CardDescription, CardHeader, CardTitle } from "@repo/ui";
import Link from "next/link";
import { useState } from "react";
import type { ChatSession } from "@/lib/api/chat";

interface ChatListItemProps {
  session: ChatSession;
  onDelete: (id: string) => Promise<void>;
}

function formatRelativeTime(dateString: string): string {
  const date = new Date(dateString);
  const now = new Date();
  const diffInSeconds = Math.floor((now.getTime() - date.getTime()) / 1000);

  if (diffInSeconds < 60) {
    return "Just now";
  }
  if (diffInSeconds < 3600) {
    return `${Math.floor(diffInSeconds / 60)}m ago`;
  }
  if (diffInSeconds < 86400) {
    return `${Math.floor(diffInSeconds / 3600)}h ago`;
  }
  if (diffInSeconds < 604800) {
    return `${Math.floor(diffInSeconds / 86400)}d ago`;
  }

  return date.toLocaleDateString();
}

export function ChatListItem({ session, onDelete }: ChatListItemProps): React.ReactElement {
  const [isDeleting, setIsDeleting] = useState(false);

  const handleDelete = async (e: React.MouseEvent): Promise<void> => {
    e.preventDefault();
    e.stopPropagation();

    if (!confirm("Are you sure you want to delete this chat?")) {
      return;
    }

    setIsDeleting(true);
    try {
      await onDelete(session.id);
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <Link href={`/chat/${session.id}`} className="block">
      <Card className="transition-colors hover:bg-accent/50">
        <CardHeader className="flex flex-row items-start justify-between space-y-0 pb-2">
          <div className="flex-1">
            <CardTitle className="text-lg">{session.title ?? "Untitled Chat"}</CardTitle>
            <CardDescription>{formatRelativeTime(session.updatedAt)}</CardDescription>
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={handleDelete}
            disabled={isDeleting}
            className="text-muted-foreground hover:text-destructive"
          >
            {isDeleting ? "..." : "Delete"}
          </Button>
        </CardHeader>
      </Card>
    </Link>
  );
}
