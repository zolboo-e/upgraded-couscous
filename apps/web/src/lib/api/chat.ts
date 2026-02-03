const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3001";

// Sandbox WebSocket URL for direct connection (bypasses API)
export const SANDBOX_WS_URL = process.env.NEXT_PUBLIC_SANDBOX_WS_URL;

// Legacy: API WebSocket URL (fallback if sandbox URL not configured)
export const WS_BASE_URL = API_BASE_URL.replace(/^http/, "ws");

/**
 * Get a short-lived WebSocket token for connecting to sandbox
 * This is needed because browsers can't set Authorization headers on WebSocket
 */
export async function getWsToken(): Promise<string | null> {
  try {
    const response = await fetch(`${API_BASE_URL}/auth/ws-token`, {
      method: "GET",
      credentials: "include",
    });

    if (!response.ok) {
      return null;
    }

    const data = await response.json();
    return data.data.token;
  } catch {
    return null;
  }
}

export interface ChatSession {
  id: string;
  userId: string;
  title: string | null;
  systemPrompt: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface ChatMessageMetadata {
  model?: string;
  tokensUsed?: number;
  stopReason?: string;
}

export type MessageType =
  | "message"
  | "permission_request"
  | "permission_response"
  | "question"
  | "question_answer";

export interface ChatMessage {
  id: string;
  sessionId: string;
  role: "user" | "assistant";
  type?: MessageType;
  content: string;
  metadata?: ChatMessageMetadata;
  createdAt: string;
}

export interface PermissionRequestContent {
  requestId: string;
  toolName: string;
  toolInput: Record<string, unknown>;
}

export interface PermissionResponseContent {
  requestId: string;
  decision: "allow" | "deny";
  modifiedInput?: Record<string, unknown>;
}

export interface QuestionContent {
  requestId: string;
  questions: Array<{
    question: string;
    header: string;
    options: Array<{ label: string; description: string }>;
    multiSelect: boolean;
  }>;
}

export interface QuestionAnswerContent {
  requestId: string;
  answers: Record<string, string>;
}

export interface ChatSessionWithMessages extends ChatSession {
  messages: ChatMessage[];
}

interface ChatSessionsResponse {
  data: ChatSession[];
}

interface ChatSessionResponse {
  data: ChatSession;
}

interface ChatSessionWithMessagesResponse {
  data: ChatSessionWithMessages;
}

interface ChatErrorResponse {
  error: {
    code: string;
    message: string;
  };
}

export async function listChatSessions(): Promise<ChatSession[]> {
  const response = await fetch(`${API_BASE_URL}/chat/sessions`, {
    method: "GET",
    credentials: "include",
  });

  if (!response.ok) {
    const error: ChatErrorResponse = await response.json();
    throw new Error(error.error.message);
  }

  const data: ChatSessionsResponse = await response.json();
  return data.data;
}

export async function createChatSession(input?: {
  title?: string;
  systemPrompt?: string;
}): Promise<ChatSession> {
  const response = await fetch(`${API_BASE_URL}/chat/sessions`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    credentials: "include",
    body: JSON.stringify(input ?? {}),
  });

  if (!response.ok) {
    const error: ChatErrorResponse = await response.json();
    throw new Error(error.error.message);
  }

  const data: ChatSessionResponse = await response.json();
  return data.data;
}

export async function deleteChatSession(id: string): Promise<void> {
  const response = await fetch(`${API_BASE_URL}/chat/sessions/${id}`, {
    method: "DELETE",
    credentials: "include",
  });

  if (!response.ok) {
    const error: ChatErrorResponse = await response.json();
    throw new Error(error.error.message);
  }
}

export async function getChatSession(id: string): Promise<ChatSessionWithMessages> {
  const response = await fetch(`${API_BASE_URL}/chat/sessions/${id}`, {
    method: "GET",
    credentials: "include",
  });

  if (!response.ok) {
    const error: ChatErrorResponse = await response.json();
    throw new Error(error.error.message);
  }

  const data: ChatSessionWithMessagesResponse = await response.json();
  return data.data;
}
