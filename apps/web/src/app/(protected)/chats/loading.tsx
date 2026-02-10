import { Skeleton } from "@repo/ui";

export default function ChatsLoading(): React.ReactElement {
  return (
    <main className="container mx-auto max-w-3xl px-4 py-8">
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <Skeleton className="h-8 w-32" />
          <Skeleton className="h-9 w-24" />
        </div>
        <Skeleton className="h-20 w-full rounded-lg" />
        <Skeleton className="h-20 w-full rounded-lg" />
        <Skeleton className="h-20 w-full rounded-lg" />
      </div>
    </main>
  );
}
