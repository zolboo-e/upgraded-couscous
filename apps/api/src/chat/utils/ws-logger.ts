import type { StreamChunk, WebSocketMessage } from "../types/chat.types.js";

const MAX_CONTENT_LENGTH = 100;

function truncate(str: string, maxLength: number): string {
  if (str.length <= maxLength) {
    return str;
  }
  return `${str.slice(0, maxLength)}...`;
}

function formatTimestamp(): string {
  return new Date().toISOString();
}

export function logWsIncoming(sessionId: string, message: WebSocketMessage): void {
  const timestamp = formatTimestamp();
  const shortSessionId = sessionId.slice(0, 8);

  let details = "";
  if (message.type === "message" && message.content) {
    details = ` content="${truncate(message.content, MAX_CONTENT_LENGTH)}"`;
  } else if (message.type === "permission_response") {
    details = ` requestId=${message.requestId?.slice(0, 8)} decision=${message.decision}`;
  } else if (message.type === "ask_user_answer") {
    details = ` requestId=${message.requestId?.slice(0, 8)}`;
  }

  console.info(`[${timestamp}] WS <- [${shortSessionId}] ${message.type}${details}`);
}

export function logWsOutgoing(sessionId: string, chunk: StreamChunk): void {
  const timestamp = formatTimestamp();
  const shortSessionId = sessionId.slice(0, 8);

  // Skip logging individual chunks to reduce noise
  if (chunk.type === "chunk") {
    return;
  }

  let details = "";
  if (chunk.type === "error" && chunk.message) {
    details = ` message="${truncate(chunk.message, MAX_CONTENT_LENGTH)}"`;
  } else if (chunk.type === "tool_permission_request") {
    details = ` tool=${chunk.toolName} requestId=${chunk.requestId?.slice(0, 8)}`;
  } else if (chunk.type === "ask_user_question") {
    details = ` requestId=${chunk.requestId?.slice(0, 8)}`;
  } else if (chunk.type === "done" && chunk.metadata) {
    details = ` tokens=${chunk.metadata.tokensUsed ?? "?"}`;
  }

  console.info(`[${timestamp}] WS -> [${shortSessionId}] ${chunk.type}${details}`);
}
