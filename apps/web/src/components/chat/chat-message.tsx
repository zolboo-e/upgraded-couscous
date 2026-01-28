"use client";

import { cn } from "@repo/ui";
import type {
  ChatMessage as ChatMessageType,
  PermissionRequestContent,
  PermissionResponseContent,
  QuestionAnswerContent,
  QuestionContent,
} from "@/lib/api/chat";
import { PermissionRequestMessage } from "./permission-request-message";
import { PermissionResponseMessage } from "./permission-response-message";
import { QuestionAnswerMessage } from "./question-answer-message";
import { QuestionMessage } from "./question-message";

interface ChatMessageProps {
  message: ChatMessageType;
}

function parseContent<T>(content: string): T | null {
  try {
    return JSON.parse(content) as T;
  } catch {
    return null;
  }
}

export function ChatMessage({ message }: ChatMessageProps): React.ReactElement {
  const type = message.type ?? "message";

  switch (type) {
    case "permission_request": {
      const content = parseContent<PermissionRequestContent>(message.content);
      if (content) {
        return <PermissionRequestMessage content={content} />;
      }
      break;
    }
    case "permission_response": {
      const content = parseContent<PermissionResponseContent>(message.content);
      if (content) {
        return <PermissionResponseMessage content={content} />;
      }
      break;
    }
    case "question": {
      const content = parseContent<QuestionContent>(message.content);
      if (content) {
        return <QuestionMessage content={content} />;
      }
      break;
    }
    case "question_answer": {
      const content = parseContent<QuestionAnswerContent>(message.content);
      if (content) {
        return <QuestionAnswerMessage content={content} />;
      }
      break;
    }
  }

  // Default: regular message
  const isUser = message.role === "user";
  return (
    <div className={cn("flex w-full", isUser ? "justify-end" : "justify-start")}>
      <div
        className={cn(
          "max-w-[80%] rounded-lg px-4 py-2",
          isUser ? "bg-primary text-primary-foreground" : "bg-muted text-foreground",
        )}
      >
        <p className="whitespace-pre-wrap break-words text-sm">{message.content}</p>
      </div>
    </div>
  );
}

interface StreamingMessageProps {
  content: string;
}

export function StreamingMessage({ content }: StreamingMessageProps): React.ReactElement {
  return (
    <div className="flex w-full justify-start">
      <div className="max-w-[80%] rounded-lg bg-muted px-4 py-2 text-foreground">
        <p className="whitespace-pre-wrap break-words text-sm">
          {content}
          <span className="ml-1 inline-block h-4 w-1 animate-pulse bg-foreground" />
        </p>
      </div>
    </div>
  );
}
