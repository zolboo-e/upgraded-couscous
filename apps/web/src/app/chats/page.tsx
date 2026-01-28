import { ChatList } from "@/components/chat/chat-list";

export default function ChatsPage(): React.ReactElement {
  return (
    <main className="container mx-auto max-w-3xl px-4 py-8">
      <ChatList />
    </main>
  );
}
