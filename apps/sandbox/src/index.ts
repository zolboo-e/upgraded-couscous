/**
 * Sandbox Worker Entry Point
 *
 * This worker proxies WebSocket connections to a Cloudflare Sandbox container
 * running the Claude Agent SDK server. It handles:
 * - Authentication via bearer tokens or JWT
 * - Session persistence via R2 storage
 * - Container lifecycle management
 *
 * @see ./app.ts for route definitions
 * @see ./services/ for business logic
 * @see ./durable-objects/session-do.ts for SessionDO (v2 WebSocket)
 */

import { Sandbox } from "@cloudflare/sandbox";
import app from "./app.js";
import { SessionDO } from "./durable-objects/session-do.js";

export default app;
export { Sandbox, SessionDO };
