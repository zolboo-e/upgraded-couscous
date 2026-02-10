"use client";

import type { QuestionAnswerContent } from "@/lib/api/chat";

interface QuestionAnswerMessageProps {
  content: QuestionAnswerContent;
}

export function QuestionAnswerMessage({ content }: QuestionAnswerMessageProps): React.ReactElement {
  return (
    <div className="flex w-full justify-end">
      <div className="max-w-[80%] rounded-lg border border-blue-200 bg-blue-100 px-4 py-2 dark:border-blue-800 dark:bg-blue-900">
        <div className="mb-1 flex items-center gap-2">
          <span className="text-sm font-medium">Your Response</span>
        </div>
        {Object.entries(content.answers).map(([question, answer]) => (
          <div key={question} className="text-sm">
            <span className="text-muted-foreground">{question}: </span>
            <span>{answer}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
