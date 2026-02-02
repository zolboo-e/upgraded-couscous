export interface QuestionItem {
  question: string;
  header: string;
  options: QuestionOption[];
  multiSelect: boolean;
}

export interface QuestionOption {
  label: string;
  description: string;
}

// Sandbox → API messages (incoming to API from sandbox)
export type SandboxOutMessage =
  | { type: "stream_start" }
  | { type: "chunk"; content: string }
  | { type: "stream_end" }
  | { type: "done"; metadata?: MessageMetadata }
  | { type: "error"; message: string }
  | {
      type: "tool_permission_request";
      requestId: string;
      toolName: string;
      toolInput: Record<string, unknown>;
    }
  | { type: "ask_user_question"; requestId: string; questions: QuestionItem[] };

// API → Sandbox messages (outgoing from API to sandbox)
export type SandboxInMessage =
  | {
      type: "start";
      sessionId?: string; // DB session UUID - used as Claude session ID for resumption
      systemPrompt?: string;
      resume?: boolean; // true = resume existing Claude session, false/undefined = new session
    }
  | { type: "message"; content: string }
  | {
      type: "permission_response";
      requestId: string;
      decision: "allow" | "deny";
      modifiedInput?: Record<string, unknown>;
      message?: string;
    }
  | { type: "ask_user_answer"; requestId: string; answers: Record<string, string> }
  | { type: "interrupt" }
  | { type: "close" };

export interface MessageMetadata {
  tokensUsed?: number;
  stopReason?: string;
}
