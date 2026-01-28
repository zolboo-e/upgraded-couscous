"use client";

import { Button, Card, CardContent, CardDescription, CardHeader, CardTitle } from "@repo/ui";

interface ChatListEmptyProps {
  onCreateChat: () => void;
  isCreating: boolean;
}

export function ChatListEmpty({
  onCreateChat,
  isCreating,
}: ChatListEmptyProps): React.ReactElement {
  return (
    <Card className="mx-auto max-w-md text-center">
      <CardHeader>
        <CardTitle>No chats yet</CardTitle>
        <CardDescription>
          Start a conversation to get help with tasks, answer questions, or brainstorm ideas.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Button onClick={onCreateChat} disabled={isCreating} className="w-full">
          {isCreating ? "Creating..." : "Start your first chat"}
        </Button>
      </CardContent>
    </Card>
  );
}
