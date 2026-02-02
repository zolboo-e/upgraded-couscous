import WebSocket from "ws";
import { SandboxConnectionError, SandboxTimeoutError } from "./errors/sandbox.errors.js";
import type { SandboxInMessage, SandboxOutMessage } from "./types/sandbox.types.js";

export interface SandboxClientConfig {
  url: string;
  token: string;
  sessionId: string;
  connectTimeout?: number;
}

type MessageHandler = (message: SandboxOutMessage) => void;
type ErrorHandler = (error: Error) => void;
type CloseHandler = () => void;

export class SandboxWebSocketClient {
  private ws: WebSocket | null = null;
  private messageHandler: MessageHandler | null = null;
  private errorHandler: ErrorHandler | null = null;
  private closeHandler: CloseHandler | null = null;
  private readonly config: Required<SandboxClientConfig>;

  constructor(config: SandboxClientConfig) {
    this.config = {
      url: config.url,
      token: config.token,
      sessionId: config.sessionId,
      connectTimeout: config.connectTimeout ?? 60000,
    };
  }

  async connect(): Promise<void> {
    return new Promise((resolve, reject) => {
      const timeoutId = setTimeout(() => {
        if (this.ws) {
          this.ws.close();
        }
        reject(new SandboxTimeoutError("Connection timeout"));
      }, this.config.connectTimeout);

      const url = new URL(this.config.url);
      url.searchParams.set("sessionId", this.config.sessionId);

      this.ws = new WebSocket(url.toString(), {
        headers: {
          Authorization: `Bearer ${this.config.token}`,
        },
      });

      this.ws.on("open", () => {
        clearTimeout(timeoutId);
        resolve();
      });

      this.ws.on("error", (error) => {
        clearTimeout(timeoutId);
        const err = new SandboxConnectionError(error.message);
        if (this.errorHandler) {
          this.errorHandler(err);
        }
        reject(err);
      });

      this.ws.on("message", (data) => {
        if (!this.messageHandler) {
          return;
        }

        try {
          const message = JSON.parse(data.toString()) as SandboxOutMessage;
          this.messageHandler(message);
        } catch (error) {
          const err = new SandboxConnectionError(
            error instanceof Error ? error.message : "Invalid message format",
          );
          if (this.errorHandler) {
            this.errorHandler(err);
          }
        }
      });

      this.ws.on("close", () => {
        this.ws = null;
        if (this.closeHandler) {
          this.closeHandler();
        }
      });
    });
  }

  send(message: SandboxInMessage): void {
    if (!this.ws || this.ws.readyState !== WebSocket.OPEN) {
      throw new SandboxConnectionError("WebSocket is not connected");
    }
    this.ws.send(JSON.stringify(message));
  }

  onMessage(handler: MessageHandler): void {
    this.messageHandler = handler;
  }

  onError(handler: ErrorHandler): void {
    this.errorHandler = handler;
  }

  onClose(handler: CloseHandler): void {
    this.closeHandler = handler;
  }

  close(): void {
    if (this.ws) {
      this.ws.close();
      this.ws = null;
    }
  }

  isConnected(): boolean {
    return this.ws !== null && this.ws.readyState === WebSocket.OPEN;
  }
}
