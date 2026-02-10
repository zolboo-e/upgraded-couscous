"use client";

import { Button } from "@repo/ui";

export default function ProtectedError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}): React.ReactElement {
  return (
    <div className="container mx-auto flex max-w-md flex-col items-center gap-4 px-4 py-16 text-center">
      <h2 className="text-xl font-semibold">Something went wrong</h2>
      <p className="text-muted-foreground">
        An error occurred while loading this page. Please try again.
      </p>
      {error.digest && <p className="text-xs text-muted-foreground">Error ID: {error.digest}</p>}
      <Button onClick={reset}>Try again</Button>
    </div>
  );
}
