import { ChatDetail } from "@/components/chat/chat-detail";

interface ChatPageProps {
  params: Promise<{ id: string }>;
}

export default async function ChatPage({ params }: ChatPageProps): Promise<React.ReactElement> {
  const { id } = await params;

  return (
    <main className="h-[calc(100vh-4rem)]">
      <ChatDetail sessionId={id} />
    </main>
  );
}
