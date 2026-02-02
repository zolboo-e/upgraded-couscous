import { WebSocket } from "ws";
import type { SessionSyncHooks } from "../sync";
import { type PermissionResult, query, type SDKMessage, type SDKUserMessage } from "./client";

// Default no-op hooks for backward compatibility
const noopSyncHooks: SessionSyncHooks = {
  onSessionStart: async () => ({ success: true, files: [], direction: "from_r2" as const }),
  onSessionEnd: async () => {},
  onStreamComplete: async () => {},
};

let syncHooks: SessionSyncHooks = noopSyncHooks;

export function setSyncHooks(hooks: SessionSyncHooks): void {
  syncHooks = hooks;
}

import {
  type AllowedPrompt,
  messageQueue,
  permissionQueue,
  planQueue,
  type Question,
  type QueueItem,
  questionQueue,
} from "../queue";

interface AskUserQuestionInput {
  questions: Question[];
  answers?: Record<string, string>;
}

interface ExitPlanModeInput {
  plan?: string;
  allowedPrompts?: AllowedPrompt[];
}

interface ChatSession {
  chatId: string;
  sessionId: string | null;
  currentItem: QueueItem | null;
  ws: WebSocket;
  abortController: AbortController;
}

const activeSessions = new Map<string, ChatSession>();

function send(ws: WebSocket, data: unknown): boolean {
  try {
    if (ws.readyState === WebSocket.OPEN) {
      ws.send(JSON.stringify(data));
      return true;
    }
    console.warn("[send] WebSocket not open, readyState:", ws.readyState);
    return false;
  } catch (error) {
    console.error("[send] Error sending message:", error);
    return false;
  }
}

function createCanUseToolForChat(chatId: string) {
  return async (
    toolName: string,
    input: Record<string, unknown>,
    options: { signal: AbortSignal; toolUseID: string },
  ): Promise<PermissionResult> => {
    const session = activeSessions.get(chatId);
    const item = session?.currentItem;
    if (!item || !session) {
      return { behavior: "deny", message: "No active chat session" };
    }

    // Handle AskUserQuestion - get user answers
    if (toolName === "AskUserQuestion") {
      const questionInput = input as unknown as AskUserQuestionInput;

      return new Promise((resolve) => {
        const questionId = questionQueue.add({
          chatId: item.chatId,
          questions: questionInput.questions,
          resolve: (answers: Record<string, string>) => {
            resolve({
              behavior: "allow",
              updatedInput: { ...input, answers },
            } as PermissionResult);
          },
        });

        send(session.ws, {
          type: "ask_question",
          questionId,
          questions: questionInput.questions,
        });

        options.signal.addEventListener("abort", () => {
          questionQueue.resolve(questionId, {});
        });
      });
    }

    // Handle ExitPlanMode - get user approval for the plan
    if (toolName === "ExitPlanMode") {
      const planInput = input as unknown as ExitPlanModeInput;

      return new Promise((resolve) => {
        const planId = planQueue.add({
          chatId: item.chatId,
          planContent: planInput.plan || "",
          allowedPrompts: planInput.allowedPrompts,
          resolve: (approved: boolean) => {
            if (approved) {
              resolve({
                behavior: "allow",
                updatedInput: input,
              });
            } else {
              resolve({ behavior: "deny", message: "User rejected the plan" });
            }
          },
        });

        send(session.ws, {
          type: "plan_approval",
          planId,
          planContent: planInput.plan || "",
          allowedPrompts: planInput.allowedPrompts,
        });

        options.signal.addEventListener("abort", () => {
          planQueue.resolve(planId, false);
        });
      });
    }

    // Handle regular tool permissions
    return new Promise((resolve) => {
      const permissionId = permissionQueue.add({
        chatId: item.chatId,
        toolName,
        toolInput: input,
        toolUseID: options.toolUseID,
        resolve,
      });

      send(session.ws, {
        type: "permission_request",
        permissionId,
        toolName,
        toolInput: input,
      });

      options.signal.addEventListener("abort", () => {
        permissionQueue.resolve(permissionId, {
          behavior: "deny",
          message: "Operation cancelled",
        });
      });
    });
  };
}

async function* createPromptGeneratorForChat(chatId: string): AsyncGenerator<SDKUserMessage> {
  for await (const item of messageQueue.consume(chatId)) {
    const session = activeSessions.get(chatId);
    if (session) {
      session.currentItem = item;
    }
    console.log(`[Agent:${chatId}] Processing message`);

    // Send stream_start event
    if (session) {
      send(session.ws, {
        type: "stream_start",
        messageId: item.assistantMessageId,
      });
    }

    yield {
      type: "user" as const,
      message: {
        role: "user" as const,
        content: item.content,
      },
      parent_tool_use_id: null,
      session_id: item.sessionId ?? crypto.randomUUID(),
    };
  }
}

async function processAgentMessages(
  chatId: string,
  agentQuery: AsyncGenerator<SDKMessage>,
): Promise<void> {
  let currentTurnContent = "";
  let currentMessageId = "";
  let turnHasContent = false;
  let sessionId: string | null = null;

  try {
    for await (const message of agentQuery) {
      const session = activeSessions.get(chatId);
      const item = session?.currentItem;
      if (!item || !session) continue;

      console.log(`[Agent:${chatId}] Received message type: ${message.type}`);

      if (!currentMessageId) {
        currentMessageId = item.assistantMessageId;
      }

      // Capture session ID from init message
      if (message.type === "system" && message.subtype === "init" && "session_id" in message) {
        sessionId = message.session_id as string;
        session.sessionId = sessionId;
      }

      if (message.type === "assistant" && "message" in message) {
        const content = message.message?.content;
        if (content && Array.isArray(content)) {
          for (const block of content) {
            if ("text" in block && typeof block.text === "string") {
              const newText = block.text.slice(currentTurnContent.length);
              if (newText) {
                currentTurnContent = block.text;
                turnHasContent = true;
                send(session.ws, {
                  type: "stream_delta",
                  content: newText,
                });
              }
            } else if ("name" in block && typeof block.name === "string") {
              // Tool use detected - complete current turn
              if (turnHasContent && currentTurnContent.trim()) {
                send(session.ws, {
                  type: "stream_end",
                  content: currentTurnContent,
                  sessionId,
                });

                console.log(`[Agent:${chatId}] Turn completed, message ${currentMessageId}`);

                currentTurnContent = "";
                turnHasContent = false;
                currentMessageId = crypto.randomUUID();

                send(session.ws, {
                  type: "stream_start",
                  messageId: currentMessageId,
                });
              }

              send(session.ws, {
                type: "tool_use",
                tool: block.name,
                input: "input" in block ? block.input : undefined,
              });
            }
          }
        }
      } else if (message.type === "stream_event" && "event" in message) {
        const event = message.event;
        if (
          event.type === "content_block_delta" &&
          "delta" in event &&
          event.delta.type === "text_delta" &&
          "text" in event.delta
        ) {
          send(session.ws, {
            type: "stream_delta",
            content: event.delta.text,
          });
          currentTurnContent += event.delta.text;
          turnHasContent = true;
        }
      } else if (message.type === "result") {
        if (message.subtype === "success") {
          if (turnHasContent && currentTurnContent.trim()) {
            send(session.ws, {
              type: "stream_end",
              content: currentTurnContent,
              sessionId,
            });

            console.log(
              `[Agent:${chatId}] Stream completed, response length: ${currentTurnContent.length}`,
            );
          } else {
            send(session.ws, {
              type: "stream_end",
              content: null,
              sessionId,
            });
          }

          currentTurnContent = "";
          currentMessageId = "";
          turnHasContent = false;
          if (session) {
            session.currentItem = null;
          }

          // Queue sync to R2 after stream completes
          syncHooks.onStreamComplete(chatId);
        } else if ("errors" in message && (message as { errors?: string[] }).errors?.length) {
          const errorMsg = (message as { errors: string[] }).errors.join("\n");
          console.log(`[Agent:${chatId}] Error: ${errorMsg}`);
          send(session.ws, {
            type: "error",
            error: errorMsg,
          });

          currentTurnContent = "";
          currentMessageId = "";
          turnHasContent = false;
          if (session) {
            session.currentItem = null;
          }
        }
      }
    }
  } catch (error) {
    console.error(`[Agent:${chatId}] Session error:`, error);
    const session = activeSessions.get(chatId);
    if (session) {
      send(session.ws, {
        type: "error",
        error: error instanceof Error ? error.message : "Unknown error",
      });
    }
    activeSessions.delete(chatId);
  }
}

export async function startChatSession(
  chatId: string,
  sessionId: string | null,
  ws: WebSocket,
  workingDirectory: string = process.cwd(),
): Promise<void> {
  // If session already exists, just update WebSocket and return
  if (activeSessions.has(chatId)) {
    console.log(`[Agent:${chatId}] Session already active, updating WebSocket`);
    updateSessionWebSocket(chatId, ws);
    return;
  }

  // Sync from R2 to local before starting (restore persisted state)
  const syncResult = await syncHooks.onSessionStart(chatId);
  send(ws, {
    type: "sync_status",
    direction: "from_r2",
    success: syncResult.success,
    files: syncResult.files,
    ...(syncResult.error && { error: syncResult.error }),
  });

  console.log(
    `[Agent:${chatId}] Starting session${sessionId ? ` (resuming ${sessionId})` : " (new)"}`,
  );

  const abortController = new AbortController();

  const session: ChatSession = {
    chatId,
    sessionId,
    currentItem: null,
    ws,
    abortController,
  };
  activeSessions.set(chatId, session);

  const agentQuery = query({
    prompt: createPromptGeneratorForChat(chatId),
    options: {
      resume: sessionId || undefined,
      tools: { type: "preset", preset: "claude_code" },
      allowedTools: [],
      permissionMode: "default",
      canUseTool: createCanUseToolForChat(chatId),
      cwd: workingDirectory,
      includePartialMessages: true,
    },
  });

  processAgentMessages(chatId, agentQuery).catch((error) => {
    console.error(`[Agent:${chatId}] Fatal error:`, error);
    activeSessions.delete(chatId);
  });
}

export async function stopChatSession(chatId: string): Promise<void> {
  const session = activeSessions.get(chatId);
  if (session) {
    console.log(`[Agent:${chatId}] Stopping session`);
    session.abortController.abort();
    activeSessions.delete(chatId);

    // Queue final sync to R2
    syncHooks.onSessionEnd(chatId);
  }
}

export function hasActiveSession(chatId: string): boolean {
  return activeSessions.has(chatId);
}

export function getSession(chatId: string): ChatSession | undefined {
  return activeSessions.get(chatId);
}

export function updateSessionWebSocket(chatId: string, ws: WebSocket): void {
  const session = activeSessions.get(chatId);
  if (session) {
    session.ws = ws;
  }
}
