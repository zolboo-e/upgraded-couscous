import type { Message, Session } from "@repo/db";

export interface CreateSessionInput {
  title?: string;
  systemPrompt?: string;
}

export interface SessionWithMessages extends Session {
  messages: Message[];
}

export interface QuestionOption {
  label: string;
  description: string;
}

export interface QuestionItem {
  question: string;
  header: string;
  options: QuestionOption[];
  multiSelect: boolean;
}

export interface StreamChunk {
  type:
    | "stream_start"
    | "chunk"
    | "stream_end"
    | "done"
    | "error"
    | "tool_permission_request"
    | "ask_user_question";
  content?: string;
  messageId?: string;
  metadata?: {
    model?: string;
    tokensUsed?: number;
    stopReason?: string;
  };
  message?: string;
  // Permission request fields
  requestId?: string;
  toolName?: string;
  toolInput?: Record<string, unknown>;
  // Ask user question fields
  questions?: QuestionItem[];
}

export interface WebSocketMessage {
  type: "message" | "interrupt" | "permission_response" | "ask_user_answer";
  content?: string;
  // Permission response fields
  requestId?: string;
  decision?: "allow" | "deny";
  modifiedInput?: Record<string, unknown>;
  message?: string;
  // Ask user answer fields
  answers?: Record<string, string>;
}
