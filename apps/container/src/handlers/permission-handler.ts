import type { PermissionResult } from "@anthropic-ai/claude-agent-sdk";
import type { WebSocket } from "ws";
import type { PermissionRegistry } from "../session/permission-registry.js";
import type { QuestionRegistry } from "../session/question-registry.js";
import type { Logger, QuestionItem } from "../types/index.js";
import { sendMessage } from "../websocket/send.js";

export type CanUseToolFn = (
  toolName: string,
  input: Record<string, unknown>,
  options: {
    signal: AbortSignal;
    toolUseID: string;
    suggestions?: unknown[];
    blockedPath?: string;
    decisionReason?: string;
    agentID?: string;
  },
) => Promise<PermissionResult>;

/**
 * Creates a canUseTool callback that routes permission requests
 * to the frontend via WebSocket and awaits the response.
 *
 * AskUserQuestion is handled specially: instead of a permission dialog,
 * it sends the questions to the frontend and returns pre-filled answers.
 */
export function createCanUseTool(
  ws: WebSocket,
  permissionRegistry: PermissionRegistry,
  questionRegistry: QuestionRegistry,
  logger: Logger,
): CanUseToolFn {
  return async (toolName, input, options): Promise<PermissionResult> => {
    const requestId = options.toolUseID;

    if (toolName === "AskUserQuestion") {
      return handleAskUserQuestion(ws, questionRegistry, logger, requestId, input, options.signal);
    }

    return handlePermissionRequest(
      ws, permissionRegistry, logger, requestId, toolName, input, options.signal,
    );
  };
}

async function handleAskUserQuestion(
  ws: WebSocket,
  registry: QuestionRegistry,
  logger: Logger,
  requestId: string,
  input: Record<string, unknown>,
  signal: AbortSignal,
): Promise<PermissionResult> {
  logger.info("AskUserQuestion request", { requestId });

  const questions = (input.questions ?? []) as QuestionItem[];
  const sent = sendMessage(
    ws,
    { type: "ask_user_question", requestId, questions },
    logger,
  );

  if (!sent) {
    logger.error("Failed to send question request, WebSocket not open");
    return {
      behavior: "deny",
      message: "WebSocket disconnected during question request",
      toolUseID: requestId,
    };
  }

  try {
    const response = await registry.register(requestId, ws, signal);
    return {
      behavior: "allow",
      updatedInput: { ...input, answers: response.answers },
      toolUseID: requestId,
    };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : "Question request failed";
    logger.error("Question request error", { requestId, error: errorMessage });
    return {
      behavior: "deny",
      message: errorMessage,
      toolUseID: requestId,
    };
  }
}

async function handlePermissionRequest(
  ws: WebSocket,
  registry: PermissionRegistry,
  logger: Logger,
  requestId: string,
  toolName: string,
  input: Record<string, unknown>,
  signal: AbortSignal,
): Promise<PermissionResult> {
  logger.info("Permission request", { toolName, requestId });

  const sent = sendMessage(
    ws,
    { type: "tool_permission_request", requestId, toolName, toolInput: input },
    logger,
  );

  if (!sent) {
    logger.error("Failed to send permission request, WebSocket not open");
    return {
      behavior: "deny",
      message: "WebSocket disconnected during permission request",
      toolUseID: requestId,
    };
  }

  try {
    const response = await registry.register(requestId, ws, signal);

    if (response.decision === "allow") {
      return {
        behavior: "allow",
        updatedInput: response.modifiedInput,
        toolUseID: requestId,
      };
    }

    return {
      behavior: "deny",
      message: response.message ?? "Permission denied by user",
      toolUseID: requestId,
    };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : "Permission request failed";
    logger.error("Permission request error", { requestId, error: errorMessage });
    return {
      behavior: "deny",
      message: errorMessage,
      toolUseID: requestId,
    };
  }
}
