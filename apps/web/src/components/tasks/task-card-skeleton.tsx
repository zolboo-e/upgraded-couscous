import { Card, CardContent, CardHeader, Skeleton } from "@repo/ui";

export function TaskCardSkeleton(): React.ReactElement {
  return (
    <Card>
      <CardHeader className="p-3 pb-0">
        <div className="flex items-start justify-between gap-2">
          <Skeleton className="h-4 w-32" />
          <Skeleton className="h-5 w-14 rounded-full" />
        </div>
      </CardHeader>
      <CardContent className="p-3 pt-2">
        <Skeleton className="mb-2 h-3 w-full" />
        <Skeleton className="h-3 w-2/3" />
      </CardContent>
    </Card>
  );
}
