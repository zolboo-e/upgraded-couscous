import { Card, CardContent, CardHeader, Skeleton } from "@repo/ui";

export default function ProjectDetailLoading(): React.ReactElement {
  return (
    <main className="container mx-auto max-w-6xl px-4 py-8">
      <Card>
        <CardHeader>
          <Skeleton className="h-8 w-64" />
          <Skeleton className="mt-2 h-4 w-96" />
        </CardHeader>
        <CardContent>
          <div className="flex gap-2">
            <Skeleton className="h-10 w-32" />
            <Skeleton className="h-10 w-24" />
          </div>
          <div className="mt-6 space-y-4">
            <Skeleton className="h-24 w-full" />
            <Skeleton className="h-24 w-full" />
          </div>
        </CardContent>
      </Card>
    </main>
  );
}
