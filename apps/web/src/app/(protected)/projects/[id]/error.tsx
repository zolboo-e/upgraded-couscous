"use client";

import { Button } from "@repo/ui";
import Link from "next/link";

export default function ProjectError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}): React.ReactElement {
  return (
    <div className="container mx-auto flex max-w-md flex-col items-center gap-4 px-4 py-16 text-center">
      <h2 className="text-xl font-semibold">Failed to load project</h2>
      <p className="text-muted-foreground">Something went wrong while loading this project.</p>
      {error.digest && <p className="text-xs text-muted-foreground">Error ID: {error.digest}</p>}
      <div className="flex gap-2">
        <Button variant="outline" asChild>
          <Link href="/projects">Back to Projects</Link>
        </Button>
        <Button onClick={reset}>Try again</Button>
      </div>
    </div>
  );
}
