import { jsonb, pgEnum, pgTable, text, timestamp, uuid } from "drizzle-orm/pg-core";
import { sessions } from "./sessions";

export const messageRoleEnum = pgEnum("message_role", ["user", "assistant"]);

export const messageTypeEnum = pgEnum("message_type", [
  "message",
  "permission_request",
  "permission_response",
  "question",
  "question_answer",
]);

export interface MessageMetadata {
  model?: string;
  tokensUsed?: number;
  stopReason?: string;
  toolsUsed?: string[];
}

export interface PermissionRequestContent {
  requestId: string;
  toolName: string;
  toolInput: Record<string, unknown>;
}

export interface PermissionResponseContent {
  requestId: string;
  decision: "allow" | "deny";
  modifiedInput?: Record<string, unknown>;
}

export interface QuestionContent {
  requestId: string;
  questions: Array<{
    question: string;
    header: string;
    options: Array<{ label: string; description: string }>;
    multiSelect: boolean;
  }>;
}

export interface QuestionAnswerContent {
  requestId: string;
  answers: Record<string, string>;
}

export const messages = pgTable("messages", {
  id: uuid("id").primaryKey().defaultRandom(),
  sessionId: uuid("session_id")
    .notNull()
    .references(() => sessions.id, { onDelete: "cascade" }),
  role: messageRoleEnum("role").notNull(),
  type: messageTypeEnum("type").notNull().default("message"),
  content: text("content").notNull(),
  metadata: jsonb("metadata").$type<MessageMetadata>(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export type Message = typeof messages.$inferSelect;
export type NewMessage = typeof messages.$inferInsert;
export type MessageType =
  | "message"
  | "permission_request"
  | "permission_response"
  | "question"
  | "question_answer";
