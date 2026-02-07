import { Card, CardContent } from "@repo/ui";
import { Construction } from "lucide-react";

export function TasksTabPlaceholder(): React.ReactElement {
  return (
    <Card>
      <CardContent className="flex flex-col items-center justify-center py-16">
        <Construction className="h-12 w-12 text-muted-foreground" />
        <h3 className="mt-4 text-lg font-semibold">Work in Progress</h3>
        <p className="mt-2 text-sm text-muted-foreground text-center max-w-md">
          The kanban board for task management is coming soon. Stay tuned for updates!
        </p>
      </CardContent>
    </Card>
  );
}
