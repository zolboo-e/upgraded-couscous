import type { QuestionItem } from "./ask-user-question";
import type { SessionRestoreStatusValue } from "./session-restore-status";

/**
 * Content block types from Claude Agent SDK
 */
export interface SDKContentBlock {
  type: "text" | "tool_use" | "thinking" | "tool_result";
  text?: string;
  id?: string;
  name?: string;
  input?: unknown;
  thinking?: string;
  tool_use_id?: string;
  content?: string;
}

/**
 * Raw SDK message structure
 */
export interface SDKMessagePayload {
  type: "assistant" | "user" | "result";
  message?: {
    content?: SDKContentBlock[];
  };
  subtype?: string;
  usage?: {
    input_tokens?: number;
    output_tokens?: number;
  };
}

/**
 * Memory stats from container
 */
export interface MemoryStats {
  heapUsed: number;
  heapTotal: number;
  rss: number;
  external: number;
}

/**
 * Raw WebSocket chunk from server
 */
export interface RawStreamChunk {
  type: string;
  content?: string;
  messageId?: string;
  metadata?: StreamChunkMetadata;
  message?: SDKMessagePayload | string;
  requestId?: string;
  toolName?: string;
  toolInput?: Record<string, unknown>;
  questions?: QuestionItem[];
  sandboxStatus?: "connected" | "disconnected" | "connecting" | "not_configured";
  status?: SessionRestoreStatusValue;
  heapUsed?: number;
  heapTotal?: number;
  rss?: number;
  external?: number;
  title?: string;
  description?: string | null;
}

export interface StreamChunkMetadata {
  model?: string;
  tokensUsed?: number;
  stopReason?: string;
}

/**
 * Normalized stream chunk with typed message fields
 */
export interface StreamChunk {
  type:
    | "stream_start"
    | "chunk"
    | "stream_end"
    | "done"
    | "error"
    | "tool_permission_request"
    | "ask_user_question"
    | "connection_status"
    | "sdk_message"
    | "session_status"
    | "memory_stats"
    | "task_updated";
  content?: string;
  messageId?: string;
  metadata?: StreamChunkMetadata;
  sdkMessage?: SDKMessagePayload;
  errorMessage?: string;
  requestId?: string;
  toolName?: string;
  toolInput?: Record<string, unknown>;
  questions?: QuestionItem[];
  sandboxStatus?: "connected" | "disconnected" | "connecting" | "not_configured";
  sessionStatus?: SessionRestoreStatusValue;
  memoryStats?: MemoryStats;
  taskUpdate?: { title?: string; description?: string | null };
}

export function parseStreamChunk(raw: RawStreamChunk): StreamChunk {
  const chunk: StreamChunk = {
    type: raw.type as StreamChunk["type"],
    content: raw.content,
    messageId: raw.messageId,
    metadata: raw.metadata,
    requestId: raw.requestId,
    toolName: raw.toolName,
    toolInput: raw.toolInput,
    questions: raw.questions,
    sandboxStatus: raw.sandboxStatus,
  };

  if (raw.type === "sdk_message" && raw.message && typeof raw.message !== "string") {
    chunk.sdkMessage = raw.message;
  } else if (raw.type === "error" && typeof raw.message === "string") {
    chunk.errorMessage = raw.message;
  } else if (raw.type === "session_status" && raw.status) {
    chunk.sessionStatus = raw.status;
  } else if (raw.type === "memory_stats" && raw.heapUsed !== undefined) {
    chunk.memoryStats = {
      heapUsed: raw.heapUsed,
      heapTotal: raw.heapTotal ?? 0,
      rss: raw.rss ?? 0,
      external: raw.external ?? 0,
    };
  } else if (raw.type === "task_updated") {
    chunk.taskUpdate = { title: raw.title, description: raw.description };
  }

  return chunk;
}
