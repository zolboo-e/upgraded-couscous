import { Card, CardContent, CardHeader, Skeleton } from "@repo/ui";

export default function OrganizationLoading(): React.ReactElement {
  return (
    <main className="container mx-auto max-w-4xl px-4 py-8">
      <Card>
        <CardHeader>
          <Skeleton className="h-8 w-48" />
        </CardHeader>
        <CardContent>
          <Skeleton className="h-4 w-64" />
        </CardContent>
      </Card>

      <Card className="mt-6">
        <CardHeader className="flex flex-row items-center justify-between">
          <Skeleton className="h-6 w-32" />
          <Skeleton className="h-9 w-28" />
        </CardHeader>
        <CardContent>
          <div className="divide-y">
            {[1, 2, 3].map((i) => (
              <div key={i} className="flex items-center justify-between py-3">
                <div className="flex items-center gap-3">
                  <Skeleton className="h-10 w-10 rounded-full" />
                  <div>
                    <Skeleton className="h-4 w-32" />
                    <Skeleton className="mt-1 h-3 w-48" />
                  </div>
                </div>
                <Skeleton className="h-6 w-16" />
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </main>
  );
}
