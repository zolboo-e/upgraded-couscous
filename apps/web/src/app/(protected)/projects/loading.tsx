import { Card, CardContent, CardHeader, Skeleton } from "@repo/ui";

export default function ProjectsLoading(): React.ReactElement {
  return (
    <main className="container mx-auto max-w-4xl px-4 py-8">
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <Skeleton className="h-8 w-32" />
          <Skeleton className="h-9 w-32" />
        </CardHeader>
        <CardContent>
          <Skeleton className="h-4 w-64" />
        </CardContent>
      </Card>

      <div className="mt-6 grid gap-4 md:grid-cols-2">
        {[1, 2, 3, 4].map((i) => (
          <Card key={i}>
            <CardHeader className="pb-2">
              <div className="flex items-center gap-2">
                <Skeleton className="h-5 w-5" />
                <Skeleton className="h-5 w-32" />
              </div>
              <Skeleton className="mt-2 h-4 w-full" />
            </CardHeader>
            <CardContent>
              <Skeleton className="h-4 w-24" />
            </CardContent>
          </Card>
        ))}
      </div>
    </main>
  );
}
