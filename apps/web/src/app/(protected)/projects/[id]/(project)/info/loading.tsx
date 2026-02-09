import { Card, CardContent, CardHeader, Skeleton } from "@repo/ui";

export default function InfoLoading(): React.ReactElement {
  return (
    <div className="grid gap-6 md:grid-cols-2">
      <Card>
        <CardHeader>
          <Skeleton className="h-6 w-32" />
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <Skeleton className="h-4 w-16" />
            <Skeleton className="mt-1 h-5 w-32" />
          </div>
          <div>
            <Skeleton className="h-4 w-20" />
            <Skeleton className="mt-1 h-5 w-32" />
          </div>
          <div>
            <Skeleton className="h-4 w-24" />
            <Skeleton className="mt-1 h-5 w-16" />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <Skeleton className="h-6 w-32" />
        </CardHeader>
        <CardContent className="space-y-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="flex items-center gap-3">
              <Skeleton className="h-8 w-8 rounded-full" />
              <div className="flex-1">
                <Skeleton className="h-4 w-32" />
                <Skeleton className="mt-1 h-3 w-24" />
              </div>
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}
