"use client";

import type { QuestionContent } from "@/lib/api/chat";

interface QuestionMessageProps {
  content: QuestionContent;
}

export function QuestionMessage({ content }: QuestionMessageProps): React.ReactElement {
  return (
    <div className="flex w-full justify-start">
      <div className="max-w-[80%] rounded-lg border border-blue-200 bg-blue-50 px-4 py-3 dark:border-blue-800 dark:bg-blue-950">
        <div className="mb-2 flex items-center gap-2">
          <span className="text-blue-500">❓</span>
          <span className="text-sm font-medium">Question from Claude</span>
        </div>
        {content.questions.map((q) => (
          <div key={`${q.header}-${q.question}`} className="mt-2">
            <p className="text-xs uppercase tracking-wide text-blue-700 dark:text-blue-300">
              {q.header}
            </p>
            <p className="font-medium">{q.question}</p>
          </div>
        ))}
      </div>
    </div>
  );
}
