import type { McpSdkServerConfigWithInstance } from "@anthropic-ai/claude-agent-sdk";
import { createSdkMcpServer, tool } from "@anthropic-ai/claude-agent-sdk";
import type { WebSocket } from "ws";
import { z } from "zod/v4";
import type { Logger, OutgoingMessage } from "../types/index.js";
import { sendMessage } from "../websocket/send.js";

interface TaskToolConfig {
  taskId: string;
  apiBaseUrl: string;
  apiToken: string;
  ws: WebSocket;
  logger: Logger;
}

export const TASK_TOOL_NAME = "task-tools";
export const UPDATE_TASK_TOOL_NAME = "mcp__task-tools__update_task";

export function createTaskMcpServer(config: TaskToolConfig): McpSdkServerConfigWithInstance {
  const { taskId, apiBaseUrl, apiToken, ws, logger } = config;

  return createSdkMcpServer({
    name: TASK_TOOL_NAME,
    version: "1.0.0",
    tools: [
      tool(
        "update_task",
        "Update the current task's title, description, and/or details. Use this after the user confirms the proposed changes via AskUserQuestion.",
        {
          title: z.string().min(1).max(255).optional(),
          description: z.string().max(2000).nullable().optional(),
          details: z.string().nullable().optional(),
        },
        async (args) => {
          logger.info("update_task called", { taskId, args });

          if (
            args.title === undefined &&
            args.description === undefined &&
            args.details === undefined
          ) {
            return {
              content: [
                {
                  type: "text" as const,
                  text: "Error: At least one field (title, description, or details) is required.",
                },
              ],
              isError: true,
            };
          }

          try {
            const url = `${apiBaseUrl}/internal/tasks/${taskId}`;
            const response = await fetch(url, {
              method: "PATCH",
              headers: {
                "Content-Type": "application/json",
                "X-Service-Token": apiToken,
              },
              body: JSON.stringify({
                title: args.title,
                description: args.description,
                details: args.details,
              }),
            });

            if (!response.ok) {
              const errorBody = await response.text();
              logger.error("update_task API error", {
                status: response.status,
                body: errorBody,
              });
              return {
                content: [
                  {
                    type: "text" as const,
                    text: `Failed to update task: ${response.status} ${errorBody}`,
                  },
                ],
                isError: true,
              };
            }

            // Notify the frontend about the task update
            const taskUpdatedMessage: OutgoingMessage = {
              type: "task_updated",
              taskId,
              title: args.title,
              description: args.description,
              details: args.details,
            };
            sendMessage(ws, taskUpdatedMessage, logger);

            const fields: string[] = [];
            if (args.title !== undefined) {
              fields.push(`title to "${args.title}"`);
            }
            if (args.description !== undefined) {
              fields.push(
                args.description === null
                  ? "description cleared"
                  : `description to "${args.description}"`,
              );
            }
            if (args.details !== undefined) {
              fields.push(args.details === null ? "details cleared" : "details updated");
            }

            logger.info("update_task success", { taskId, fields });

            return {
              content: [
                {
                  type: "text" as const,
                  text: `Task updated successfully: ${fields.join(", ")}.`,
                },
              ],
            };
          } catch (error) {
            const errorMessage = error instanceof Error ? error.message : String(error);
            logger.error("update_task error", { taskId, error: errorMessage });
            return {
              content: [
                {
                  type: "text" as const,
                  text: `Failed to update task: ${errorMessage}`,
                },
              ],
              isError: true,
            };
          }
        },
      ),
    ],
  });
}
