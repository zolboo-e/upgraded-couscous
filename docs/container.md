# Container Architecture

WebSocket server running Claude Agent SDK inside Cloudflare sandbox containers.

## Directory Structure

```
apps/container/src/
├── index.ts                    # Server entry point
├── config/
│   └── env.ts                  # Environment configuration
├── handlers/
│   ├── message-handlers.ts     # WebSocket message routing
│   ├── claude-processor.ts     # Claude SDK message processing
│   └── permission-handler.ts   # Permission/question routing
├── websocket/
│   └── send.ts                 # WebSocket send utility
├── session/
│   ├── message-queue.ts        # Per-session async message queue
│   ├── message-factory.ts      # SDK message creation
│   ├── session-check.ts        # Session existence verification
│   ├── permission-registry.ts  # Tool permission request management
│   └── question-registry.ts    # User question request management
├── tools/
│   ├── index.ts                # MCP tool exports
│   └── update-task.ts          # Task update MCP server
├── services/
│   ├── logger.ts               # Logger with telemetry
│   ├── telemetry.ts            # Upstash Redis client
│   ├── memory-monitor.ts       # Memory stats monitoring
│   └── sync.ts                 # R2 session sync
├── shutdown/
│   └── graceful-shutdown.ts    # Graceful shutdown handler
└── types/
    └── index.ts                # TypeScript definitions
```

## WebSocket Server

**File:** `src/index.ts`

- HTTP server with Hono on port 8080
- WebSocket server on root path
- Health check at `/health`
- Signal handlers for graceful shutdown (SIGTERM, SIGINT)

## Message Protocol

### Incoming (Browser → Container)

| Type                  | Description                                                  |
| --------------------- | ------------------------------------------------------------ |
| `start`               | Initialize Claude query (includes optional `taskId`, `projectId`) |
| `message`             | User chat message                                            |
| `permission_response` | Tool permission decision (requestId, decision, modifiedInput) |
| `ask_user_answer`     | Answer to Claude's question (requestId, answers)             |
| `close`               | Graceful disconnect                                          |

### Outgoing (Container → Browser)

| Type                       | Description                                       |
| -------------------------- | ------------------------------------------------- |
| `sdk_message`              | Raw Claude SDK messages                           |
| `stream_start`             | Begin streaming                                   |
| `chunk`                    | Text content chunk                                |
| `stream_end`               | End streaming                                     |
| `done`                     | Response complete with metadata                   |
| `error`                    | Error message                                     |
| `memory_stats`             | Memory usage (heap, RSS)                          |
| `agent_status`             | Agent processing status (e.g., "pending")         |
| `task_updated`             | Task fields updated by agent                      |
| `tool_permission_request`  | Request tool permission from frontend             |
| `ask_user_question`        | Forward Claude's question to frontend             |

## Claude Agent SDK Integration

**Dependency:** `@anthropic-ai/claude-agent-sdk`

```typescript
const claudeQuery = query({
  prompt: promptGenerator, // Async generator of user messages
  options: {
    model: CLAUDE_MODEL,
    systemPrompt: message.systemPrompt,
    extraArgs: { "session-id": sessionId }, // New session
    resume: sessionId, // Resume existing
  },
});
```

### Session Handling

| Scenario       | SDK Options                       |
| -------------- | --------------------------------- |
| New session    | `extraArgs: { "session-id": id }` |
| Resume session | `resume: id`                      |

Session existence checked by looking for files in `/root/.claude/`.

## MCP Task Tools

**File:** `src/tools/update-task.ts`

When a session is linked to a task (`taskId` present in `start` message), the container creates an MCP server that gives Claude the ability to update task fields.

- **Tool name:** `mcp__task-tools__update_task`
- **Created when:** `taskId`, `API_BASE_URL`, and `INTERNAL_API_TOKEN` are all available
- **Updatable fields:** `title`, `description`, `details`
- **Endpoint:** `PATCH {API_BASE_URL}/internal/tasks/{taskId}` with `X-Service-Token` header
- **On success:** Sends `task_updated` message to browser with updated fields

```typescript
// MCP tools are conditionally added to the Claude query
const hasTaskTools = !!(message.taskId && apiBaseUrl && apiToken);
const mcpServers = hasTaskTools
  ? { "task-tools": createTaskMcpServer({ taskId, apiBaseUrl, apiToken, ws, logger }) }
  : undefined;

// Tools must appear in both arrays
tools: [...(hasTaskTools ? [UPDATE_TASK_TOOL_NAME] : [])],
allowedTools: [...(hasTaskTools ? [UPDATE_TASK_TOOL_NAME] : [])],
```

## Permission & Question Handling

The container mediates between Claude's tool permission requests and the browser frontend.

### PermissionRegistry (`session/permission-registry.ts`)

Promise-based request/response pattern for tool permissions. When Claude requests to use a tool, a pending Promise is created and the request is forwarded to the browser. The Promise resolves when the browser sends a `permission_response` message.

### QuestionRegistry (`session/question-registry.ts`)

Same pattern for `AskUserQuestion` tool responses. When Claude asks the user a question, a pending Promise is created and questions are forwarded to the browser. The Promise resolves when the browser sends an `ask_user_answer` message.

### PermissionHandler (`handlers/permission-handler.ts`)

Routes permission requests differently based on tool type:

- **`AskUserQuestion` tool:** Sends `ask_user_question` message to browser, awaits answer via `QuestionRegistry`, returns answers as `updatedInput`
- **All other tools:** Sends `tool_permission_request` message to browser, awaits decision via `PermissionRegistry`, returns allow/deny

Both registries clean up pending requests on WebSocket disconnect.

## Message Handling Pipeline

### SessionMessageQueue

Per-WebSocket async generator for message flow.

```typescript
// Producer: Enqueue user messages
sessionQueue.enqueue(ws, userMessage);

// Consumer: Claude SDK consumes via async generator
for await (const message of sessionQueue.consume(ws)) {
  // SDK processes message
}
```

### Processing Flow

```
WebSocket message
      │
      ▼
handleMessage() routes by type
      │
      ├─► "start" → handleStart()
      │              └─► Initialize queue + Claude query
      │                  (+ MCP task tools if taskId present)
      │
      ├─► "message" → handleUserMessage()
      │               └─► sessionQueue.enqueue()
      │                       │
      │                       ▼
      │               Claude SDK processes
      │                       │
      │                       ▼
      │               processClaudeMessages()
      │                       │
      │                       ▼
      │               sendMessage() to browser
      │
      ├─► "permission_response" → permissionRegistry.resolve()
      │
      ├─► "ask_user_answer" → questionRegistry.resolve()
      │
      └─► "close" → cleanup registries + close connection
```

## Session Persistence

**File:** `src/services/sync.ts`

After Claude completes a response, syncs session to R2:

```typescript
// Sync directories to R2 persistent storage
rsync /root/.claude/projects → /persistent/{sessionId}/.claude/projects
rsync /root/.claude/todos → /persistent/{sessionId}/.claude/todos
```

Only runs in production mode.

## Graceful Shutdown

**File:** `src/shutdown/graceful-shutdown.ts`

On SIGTERM/SIGINT:

1. Close all WebSocket connections (1s timeout each)
2. Clean up sessions and sync to R2
3. Log to Upstash telemetry
4. Close WebSocket server, then HTTP server
5. Force exit after 8s timeout

## Services

### Logger

Writes to console and `/tmp/server.log`. Optionally pushes to Upstash Redis.

### Telemetry

Upstash Redis integration for observability:

- `sandbox:server:logs` - Server logs
- `sandbox:shutdown:logs` - Shutdown events

### Memory Monitor

Sends memory stats to client every 1000ms:

- `heapUsed`, `heapTotal`, `rss`, `external` (in MB)

## Environment Variables

| Variable              | Default                    | Description                          |
| --------------------- | -------------------------- | ------------------------------------ |
| `CLAUDE_MODEL`        | `claude-sonnet-4-20250514` | Claude model ID                      |
| `ENVIRONMENT`         | -                          | "production" enables R2 sync         |
| `API_BASE_URL`        | -                          | API server URL (for MCP task tools)  |
| `INTERNAL_API_TOKEN`  | -                          | Service token (for MCP task tools)   |
| `UPSTASH_REDIS_URL`   | -                          | Telemetry endpoint (optional)        |
| `UPSTASH_REDIS_TOKEN` | -                          | Telemetry auth (optional)            |

## Configuration

**File:** `src/config/env.ts`

```typescript
SERVER_CONFIG = {
  port: 8080,
  logFile: "/tmp/server.log",
};

SYNC_CONFIG = {
  basePath: "/persistent",
  localPath: "/root/.claude",
  projectsDir: "projects",
  todosDir: "todos",
};
```

## Docker Build

**File:** `Dockerfile`

Multi-stage build:

1. **Base**: Cloudflare sandbox v0.7.0 + rsync + Claude CLI
2. **Pruner**: Turbo prune for container dependencies
3. **Builder**: Install deps and build with tsup
4. **Runner**: Copy artifacts to `/workspace`

**Port:** 8080
**Command timeout:** 300000ms (5 minutes)

## Key Files Reference

| File                                  | Purpose                        |
| ------------------------------------- | ------------------------------ |
| `src/index.ts`                        | Server initialization          |
| `src/handlers/message-handlers.ts`    | WebSocket message routing      |
| `src/handlers/claude-processor.ts`    | SDK message processing         |
| `src/handlers/permission-handler.ts`  | Permission/question routing    |
| `src/session/message-queue.ts`        | Async message queue            |
| `src/session/permission-registry.ts`  | Permission request management  |
| `src/session/question-registry.ts`    | Question request management    |
| `src/tools/update-task.ts`            | MCP task update tool           |
| `src/services/sync.ts`               | R2 session persistence         |
| `src/shutdown/graceful-shutdown.ts`   | Graceful shutdown              |
| `Dockerfile`                          | Container build configuration  |

## Development

```bash
pnpm dev      # Start with hot reload
pnpm build    # Build with tsup
```

## Related Documentation

- [WebSocket Lifecycle](websocket-lifecycle.md) - Connection flow between components
- [Sandbox Architecture](sandbox.md) - Cloudflare Worker orchestration
