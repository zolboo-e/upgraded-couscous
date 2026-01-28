export interface ToolPermissionRequest {
  type: "tool_permission_request";
  requestId: string;
  toolName: string;
  toolInput: Record<string, unknown>;
  timestamp: number;
}

export interface ToolPermissionResponse {
  requestId: string;
  decision: "allow" | "deny";
  modifiedInput?: Record<string, unknown>;
  message?: string;
}

export interface AskUserQuestionRequest {
  type: "ask_user_question";
  requestId: string;
  questions: QuestionItem[];
}

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

export interface AskUserQuestionResponse {
  requestId: string;
  answers: Record<string, string>;
}

export type PermissionResult =
  | { behavior: "allow"; updatedInput: Record<string, unknown> }
  | { behavior: "deny"; message: string };

export type CanUseTool = (
  toolName: string,
  input: Record<string, unknown>,
  options: { signal: AbortSignal },
) => Promise<PermissionResult>;
