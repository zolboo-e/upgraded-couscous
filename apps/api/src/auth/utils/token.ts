import { randomBytes } from "node:crypto";

const TOKEN_LENGTH = 32;

export function generateSecureToken(): string {
  return randomBytes(TOKEN_LENGTH).toString("hex");
}
