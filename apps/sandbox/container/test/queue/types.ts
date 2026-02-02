export interface QueueItem {
  chatId: string;
  content: string;
  userMessageId: string;
  assistantMessageId: string;
  sessionId: string | null;
}

export interface Question {
  question: string;
  options: { label: string; description?: string }[];
}

export interface AllowedPrompt {
  tool: string;
  prompt: string;
}
