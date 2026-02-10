"use client";

import { Button, Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@repo/ui";
import { PanelRightOpen } from "lucide-react";

interface TaskSplitLayoutProps {
  chatPanel: React.ReactNode;
  infoPanel: React.ReactNode;
}

export function TaskSplitLayout({
  chatPanel,
  infoPanel,
}: TaskSplitLayoutProps): React.ReactElement {
  return (
    <div className="relative flex h-full">
      <div className="min-w-0 flex-1">{chatPanel}</div>

      <div className="hidden w-[380px] shrink-0 border-l lg:block">
        <div className="h-full overflow-y-auto p-4">{infoPanel}</div>
      </div>

      <Sheet>
        <SheetTrigger asChild>
          <Button size="icon" variant="outline" className="absolute right-2 top-2 z-30 lg:hidden">
            <PanelRightOpen className="h-4 w-4" />
          </Button>
        </SheetTrigger>
        <SheetContent side="right" className="overflow-y-auto sm:max-w-[380px]">
          <SheetHeader>
            <SheetTitle>Task Info</SheetTitle>
          </SheetHeader>
          <div className="px-4 pb-4">{infoPanel}</div>
        </SheetContent>
      </Sheet>
    </div>
  );
}
