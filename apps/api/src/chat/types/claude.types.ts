export interface ClaudeMessage {
  role: "user" | "assistant";
  content: string;
}

export interface ClaudeChatInput {
  messages: ClaudeMessage[];
  systemPrompt?: string;
}

export interface ClaudeChatResponse {
  content: string;
  model: string;
  tokensUsed: number;
  stopReason: string;
}

export interface ClaudeStreamChunk {
  type: "content" | "done" | "session_init";
  content?: string;
  claudeSessionId?: string;
  metadata?: {
    model?: string;
    tokensUsed?: number;
    stopReason?: string;
  };
}
