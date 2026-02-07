import { Skeleton } from "@repo/ui";

export default function ProjectLoading(): React.ReactElement {
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <Skeleton className="h-6 w-16" />
        <Skeleton className="h-9 w-24" />
      </div>

      <div className="flex gap-4 overflow-x-auto pb-4">
        {["todo", "in_progress", "done", "cancelled"].map((col) => (
          <div key={col} className="w-72 flex-shrink-0 space-y-3">
            <Skeleton className="h-6 w-24" />
            <div className="space-y-2">
              <Skeleton className="h-24 w-full rounded-lg" />
              <Skeleton className="h-24 w-full rounded-lg" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
