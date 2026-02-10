"use client";

import { Button, Card, CardContent, CardFooter, CardHeader, CardTitle } from "@repo/ui";

interface ErrorOverlayProps {
  message: string;
  onDismiss: () => void;
}

export function ErrorOverlay({ message, onDismiss }: ErrorOverlayProps): React.ReactElement {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <Card className="w-full max-w-md mx-4">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-destructive">
            <span>Error</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-foreground/70">{message}</p>
        </CardContent>
        <CardFooter className="flex justify-end">
          <Button variant="outline" onClick={onDismiss}>
            Dismiss
          </Button>
        </CardFooter>
      </Card>
    </div>
  );
}
