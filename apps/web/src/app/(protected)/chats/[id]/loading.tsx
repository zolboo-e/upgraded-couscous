export default function ChatDetailLoading(): React.ReactElement {
  return (
    <main className="h-[calc(100vh-4rem)]">
      <div className="flex h-full items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
      </div>
    </main>
  );
}
