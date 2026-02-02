"use client";

import { useRouter } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import { useAuth } from "@/contexts/auth-context";
import {
  type ChatSession,
  createChatSession,
  deleteChatSession,
  listChatSessions,
} from "@/lib/api/chat";
import { ChatListEmpty } from "./chat-list-empty";
import { ChatListItem } from "./chat-list-item";
import { NewChatButton } from "./new-chat-button";

export function ChatList(): React.ReactElement {
  const { isAuthenticated, isLoading: isAuthLoading } = useAuth();
  const router = useRouter();
  const [sessions, setSessions] = useState<ChatSession[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isCreating, setIsCreating] = useState(false);

  const fetchSessions = useCallback(async (): Promise<void> => {
    try {
      const data = await listChatSessions();
      setSessions(data);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load chats");
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!isAuthLoading && !isAuthenticated) {
      router.push("/login");
      return;
    }

    if (isAuthenticated) {
      fetchSessions();
    }
  }, [isAuthenticated, isAuthLoading, router, fetchSessions]);

  const handleDelete = async (id: string): Promise<void> => {
    await deleteChatSession(id);
    setSessions((prev) => prev.filter((s) => s.id !== id));
  };

  const handleCreateFromEmpty = async (): Promise<void> => {
    setIsCreating(true);
    try {
      const session = await createChatSession();
      router.push(`/chats/${session.id}`);
    } finally {
      setIsCreating(false);
    }
  };

  if (isAuthLoading || isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="rounded-md bg-destructive/10 p-4 text-center text-destructive">{error}</div>
    );
  }

  if (sessions.length === 0) {
    return <ChatListEmpty onCreateChat={handleCreateFromEmpty} isCreating={isCreating} />;
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-semibold">Your Chats</h2>
        <NewChatButton />
      </div>
      <div className="space-y-3">
        {sessions.map((session) => (
          <ChatListItem key={session.id} session={session} onDelete={handleDelete} />
        ))}
      </div>
    </div>
  );
}
