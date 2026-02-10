import { parseResponse } from "hono/client";
import { getSessionToken } from "../actions/auth";
import { API_BASE_URL, api } from "./client";

// Sandbox WebSocket URL for direct connection (bypasses API)
export const SANDBOX_WS_URL = process.env.NEXT_PUBLIC_SANDBOX_WS_URL;

// Legacy: API WebSocket URL (fallback if sandbox URL not configured)
export const WS_BASE_URL = API_BASE_URL.replace(/^http/, "ws");

// Types needed by components for local object construction
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
  toolsUsed?: string[];
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
  metadata?: ChatMessageMetadata | null;
  createdAt: string;
}

export interface ChatSessionWithMessages extends ChatSession {
  messages: ChatMessage[];
}

/**
 * Get session token for WebSocket connections to sandbox.
 * Uses server action since browsers can't set Authorization headers on WebSocket.
 */
export async function getWsToken(): Promise<string | null> {
  return getSessionToken();
}

// WebSocket-specific types (not covered by RPC)
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

export async function listChatSessions(): Promise<ChatSession[]> {
  const data = await parseResponse(api.chat.sessions.$get());
  return data.data;
}

export async function createChatSession(input?: {
  title?: string;
  systemPrompt?: string;
}): Promise<ChatSession> {
  const data = await parseResponse(api.chat.sessions.$post({ json: input ?? {} }));
  return data.data;
}

export async function deleteChatSession(id: string): Promise<void> {
  await parseResponse(api.chat.sessions[":id"].$delete({ param: { id } }));
}

export async function getChatSession(id: string): Promise<ChatSessionWithMessages> {
  const data = await parseResponse(api.chat.sessions[":id"].$get({ param: { id } }));
  return data.data;
}

export async function getTaskSession(taskId: string): Promise<ChatSession> {
  const data = await parseResponse(api.chat.sessions.task[":taskId"].$get({ param: { taskId } }));
  return data.data;
}
