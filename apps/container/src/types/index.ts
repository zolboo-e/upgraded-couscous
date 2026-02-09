import type { SDKMessage } from "@anthropic-ai/claude-agent-sdk";
import type { WebSocket } from "ws";

/**
 * Incoming WebSocket message from client
 */
export interface IncomingMessage {
  type: "start" | "message" | "close";
  content?: string;
  systemPrompt?: string;
  sessionId?: string; // DB session UUID - used as Claude session ID
  resume?: boolean; // true = resume existing session, false/undefined = new session
  taskId?: string; // Task UUID if this session is linked to a task
  projectId?: string; // Project UUID if this session is linked to a task
}

/**
 * Outgoing WebSocket message to client
 * sdk_message: forwards raw SDK messages for real-time display
 */
export type OutgoingMessage =
  | { type: "stream_start" }
  | { type: "stream_end" }
  | { type: "sdk_message"; message: SDKMessage }
  | { type: "chunk"; content: string }
  | { type: "done"; metadata?: { tokensUsed?: number; stopReason?: string } }
  | { type: "error"; message: string }
  | { type: "memory_stats"; heapUsed: number; heapTotal: number; rss: number; external: number }
  | { type: "task_updated"; taskId: string; title?: string; description?: string | null };

/**
 * State tracked for each WebSocket session
 */
export interface SessionState {
  sessionId: string | null; // DB session UUID for R2 sync path
  taskId: string | null; // Task UUID for agent tools
  projectId: string | null; // Project UUID for agent tools
}

/**
 * Shutdown log entry for Upstash telemetry
 */
export interface ShutdownLogEntry {
  timestamp: string;
  signal: string;
  sessionIds: string[];
  connectionsCount: number;
  syncedSessions: Array<{
    sessionId: string;
    status: "success" | "error";
    error?: string;
  }>;
  shutdownStatus: "success" | "timeout" | "error";
  errorMessage?: string;
  durationMs: number;
  logs: string;
}

/**
 * Logger interface for dependency injection
 */
export interface Logger {
  info(message: string, data?: unknown): void;
  error(message: string, data?: unknown): void;
  debug(message: string, data?: unknown): void;
}

/**
 * Telemetry interface for dependency injection
 */
export interface Telemetry {
  logToUpstash(line: string): Promise<void>;
  logShutdownToUpstash(entry: ShutdownLogEntry): Promise<void>;
}

/**
 * Dependencies for handlers
 */
export interface HandlerDependencies {
  sessions: Map<WebSocket, SessionState>;
  logger: Logger;
  syncSession: (sessionId: string | null) => Promise<void>;
}

/**
 * Exec function type for dependency injection
 */
export type ExecFn = (command: string) => Promise<{ stdout: string; stderr: string }>;
