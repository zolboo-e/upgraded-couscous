import {
  type Query,
  query,
  type SDKMessage,
  type SDKUserMessage,
} from "@anthropic-ai/claude-agent-sdk";
import { ClaudeApiError } from "../errors/chat.errors.js";
import type { ClaudeStreamChunk } from "../types/claude.types.js";
import type { CanUseTool } from "../types/permission.types.js";

export interface ClaudeServiceConfig {
  model?: string;
}

export interface StreamingChatOptions {
  systemPrompt?: string;
  canUseTool?: CanUseTool;
  claudeSessionId?: string;
}

export class MessageQueue implements AsyncIterable<SDKUserMessage> {
  private queue: SDKUserMessage[] = [];
  private resolve: ((value: IteratorResult<SDKUserMessage>) => void) | null = null;
  private done = false;

  push(message: SDKUserMessage): void {
    if (this.resolve) {
      this.resolve({ value: message, done: false });
      this.resolve = null;
    } else {
      this.queue.push(message);
    }
  }

  close(): void {
    this.done = true;
    if (this.resolve) {
      this.resolve({ value: undefined as unknown as SDKUserMessage, done: true });
    }
  }

  [Symbol.asyncIterator](): AsyncIterator<SDKUserMessage> {
    return {
      next: (): Promise<IteratorResult<SDKUserMessage>> =>
        new Promise((resolve) => {
          const nextMessage = this.queue.shift();
          if (nextMessage !== undefined) {
            resolve({ value: nextMessage, done: false });
          } else if (this.done) {
            resolve({ value: undefined as unknown as SDKUserMessage, done: true });
          } else {
            this.resolve = resolve;
          }
        }),
    };
  }
}

export class ClaudeService {
  private readonly config: Required<ClaudeServiceConfig>;

  constructor(config: ClaudeServiceConfig) {
    this.config = {
      model: config.model ?? "claude-sonnet-4-20250514",
    };
  }

  createMessageQueue(): MessageQueue {
    return new MessageQueue();
  }

  createUserMessage(content: string): SDKUserMessage {
    return {
      type: "user",
      session_id: "",
      message: {
        role: "user",
        content: [{ type: "text", text: content }],
      },
      parent_tool_use_id: null,
    };
  }

  startStreamingChat(messageQueue: MessageQueue, options?: StreamingChatOptions): Query {
    try {
      return query({
        prompt: messageQueue,
        options: {
          model: this.config.model,
          systemPrompt: options?.systemPrompt,
          canUseTool: options?.canUseTool,
          resume: options?.claudeSessionId,
          // cwd: "/Users/personal/Workspace/test/teest",
        },
      });
    } catch (error) {
      throw new ClaudeApiError(error instanceof Error ? error.message : "Unknown Claude API error");
    }
  }

  async *processMessages(claudeQuery: Query): AsyncGenerator<ClaudeStreamChunk> {
    try {
      for await (const message of claudeQuery) {
        const chunk = this.processMessage(message);
        if (chunk) {
          yield chunk;
        }
      }
    } catch (error) {
      throw new ClaudeApiError(error instanceof Error ? error.message : "Unknown Claude API error");
    }
  }

  private processMessage(message: SDKMessage): ClaudeStreamChunk | null {
    // Handle system init message to capture Claude session ID
    if (
      message.type === "system" &&
      message.subtype === "init" &&
      "session_id" in message &&
      typeof message.session_id === "string"
    ) {
      return { type: "session_init", claudeSessionId: message.session_id };
    }

    if (message.type === "assistant") {
      const content = message.message.content;
      if (Array.isArray(content)) {
        const textContent = content
          .filter((block): block is { type: "text"; text: string } => block.type === "text")
          .map((block) => block.text)
          .join("");
        if (textContent) {
          return { type: "content", content: textContent };
        }
      }
    }

    if (message.type === "result") {
      return {
        type: "done",
        metadata: {
          tokensUsed: message.usage?.input_tokens ?? 0 + (message.usage?.output_tokens ?? 0),
          stopReason: message.subtype,
        },
      };
    }

    return null;
  }
}
